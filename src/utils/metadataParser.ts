import { isAndroid } from './platformDetect';

export interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl?: string;
}

// Helper: check if header starts with "ID3"
const isID3 = (view: DataView): boolean => {
  return (
    view.byteLength >= 3 &&
    view.getUint8(0) === 0x49 && // 'I'
    view.getUint8(1) === 0x44 && // 'D'
    view.getUint8(2) === 0x33    // '3'
  );
};

// Helper: check if header starts with "fLaC"
const isFlac = (view: DataView): boolean => {
  return (
    view.byteLength >= 4 &&
    view.getUint8(0) === 0x66 && // 'f'
    view.getUint8(1) === 0x4c && // 'L'
    view.getUint8(2) === 0x61 && // 'a'
    view.getUint8(3) === 0x43    // 'C'
  );
};

// Parse synchsafe size from ID3v2 header
const getSynchsafeSize = (data: DataView, offset: number): number => {
  const b1 = data.getUint8(offset);
  const b2 = data.getUint8(offset + 1);
  const b3 = data.getUint8(offset + 2);
  const b4 = data.getUint8(offset + 3);
  return (b1 << 21) | (b2 << 14) | (b3 << 7) | b4;
};

// Parse 32-bit big endian integer
const getUint32Size = (data: DataView, offset: number): number => {
  return data.getUint32(offset, false);
};

// Decode encoded text frame
const decodeString = (buffer: ArrayBuffer, offset: number, length: number, encoding: number): string => {
  if (length <= 0) return "";
  const view = new Uint8Array(buffer, offset, length);
  
  // Trim trailing nulls
  let actualLength = length;
  while (actualLength > 0 && view[actualLength - 1] === 0) {
    actualLength--;
  }
  if (actualLength === 0) return "";
  
  const subView = new Uint8Array(buffer, offset, actualLength);
  
  try {
    if (encoding === 0x00) {
      // Latin-1 (ISO-8859-1) / Windows-1252
      return new TextDecoder("windows-1252").decode(subView).trim();
    } else if (encoding === 0x01) {
      // UTF-16 with BOM (usually starts with 0xFEFF or 0xFFFE)
      return new TextDecoder("utf-16").decode(subView).trim();
    } else if (encoding === 0x02) {
      // UTF-16BE without BOM
      return new TextDecoder("utf-16be").decode(subView).trim();
    } else if (encoding === 0x03) {
      // UTF-8
      return new TextDecoder("utf-8").decode(subView).trim();
    }
  } catch (e) {
    console.error("TextDecoder failed:", e);
  }
  
  // Fallback: simple character mapping
  let str = "";
  for (let i = 0; i < actualLength; i++) {
    const charCode = view[i];
    if (charCode > 0) {
      str += String.fromCharCode(charCode);
    }
  }
  return str.trim();
};

// Parse APIC (Attached Picture) frame in ID3v2.3 / ID3v2.4
const parseApicFrame = (buffer: ArrayBuffer, offset: number, length: number): string | undefined => {
  try {
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);
    
    const encoding = view.getUint8(offset);
    
    // 1. Find end of MIME type string
    let mimeTypeEnd = offset + 1;
    while (mimeTypeEnd < offset + length && uint8[mimeTypeEnd] !== 0) {
      mimeTypeEnd++;
    }
    
    if (mimeTypeEnd >= offset + length) return undefined;
    
    const mimeBytes = uint8.subarray(offset + 1, mimeTypeEnd);
    const mimeType = new TextDecoder("ascii").decode(mimeBytes) || "image/jpeg";
    
    // 2. Picture type (1 byte after MIME type null-terminator)
    const picTypeOffset = mimeTypeEnd + 1;
    if (picTypeOffset >= offset + length) return undefined;
    
    // 3. Find end of description string
    let descEnd = picTypeOffset + 1;
    if (encoding === 0x01 || encoding === 0x02) {
      // UTF-16 has 2-byte null terminator (0x00 0x00)
      while (descEnd < offset + length - 1 && !(uint8[descEnd] === 0 && uint8[descEnd + 1] === 0)) {
        descEnd += 2;
      }
      descEnd += 2;
    } else {
      // Latin-1 and UTF-8 have 1-byte null terminator (0x00)
      while (descEnd < offset + length && uint8[descEnd] !== 0) {
        descEnd++;
      }
      descEnd++;
    }
    
    if (descEnd >= offset + length) return undefined;
    
    // 4. Extract picture binary bytes
    const picData = uint8.subarray(descEnd, offset + length);
    if (picData.length === 0) return undefined;
    
    // Create Blob URL
    const blob = new Blob([picData], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error("Error parsing APIC image:", err);
    return undefined;
  }
};

// Parse ID3v2 tag buffer
export const parseID3 = (buffer: ArrayBuffer): { title?: string; artist?: string; album?: string; coverUrl?: string } => {
  const result: { title?: string; artist?: string; album?: string; coverUrl?: string } = {};
  
  try {
    const view = new DataView(buffer);
    if (buffer.byteLength < 10) return result;
    
    if (!isID3(view)) return result;
    
    const majorVersion = view.getUint8(3);
    const flags = view.getUint8(5);
    const tagSize = getSynchsafeSize(view, 6);
    
    // Primarily support major version 3 (ID3v2.3) and 4 (ID3v2.4)
    if (majorVersion !== 3 && majorVersion !== 4) {
      return result;
    }
    
    let offset = 10;
    
    // Handle optional extended header (bit 6 of flags byte)
    const hasExtendedHeader = (flags & 0x40) !== 0;
    if (hasExtendedHeader) {
      if (offset + 4 <= buffer.byteLength) {
        const extHeaderSize = getSynchsafeSize(view, offset);
        offset += extHeaderSize + (majorVersion === 3 ? 4 : 0);
      }
    }
    
    const maxOffset = Math.min(tagSize + 10, buffer.byteLength);
    
    while (offset + 10 <= maxOffset) {
      // If we encounter padding (0x00 bytes), exit early
      if (view.getUint8(offset) === 0) {
        break;
      }
      
      // Frame ID (4-character string)
      let frameId = "";
      for (let i = 0; i < 4; i++) {
        frameId += String.fromCharCode(view.getUint8(offset + i));
      }
      
      let frameSize = 0;
      if (majorVersion === 4) {
        frameSize = getSynchsafeSize(view, offset + 4);
      } else {
        frameSize = getUint32Size(view, offset + 4);
      }
      
      const frameHeaderSize = 10;
      const dataOffset = offset + frameHeaderSize;
      
      if (dataOffset + frameSize > buffer.byteLength) {
        break; // Guard against out of bounds
      }
      
      if (frameSize > 1) {
        if (frameId === "TIT2") {
          const enc = view.getUint8(dataOffset);
          result.title = decodeString(buffer, dataOffset + 1, frameSize - 1, enc);
        } else if (frameId === "TPE1") {
          const enc = view.getUint8(dataOffset);
          result.artist = decodeString(buffer, dataOffset + 1, frameSize - 1, enc);
        } else if (frameId === "TALB") {
          const enc = view.getUint8(dataOffset);
          result.album = decodeString(buffer, dataOffset + 1, frameSize - 1, enc);
        } else if (frameId === "APIC") {
          result.coverUrl = parseApicFrame(buffer, dataOffset, frameSize);
        }
      }
      
      offset += frameHeaderSize + frameSize;
    }
  } catch (e) {
    console.error("ID3 parsing exception:", e);
  }
  
  return result;
};

// Parse FLAC metadata blocks (Vorbis comment block + Picture block)
export const parseFLAC = (buffer: ArrayBuffer): { title?: string; artist?: string; album?: string; coverUrl?: string } => {
  const result: { title?: string; artist?: string; album?: string; coverUrl?: string } = {};
  
  try {
    const view = new DataView(buffer);
    if (buffer.byteLength < 4 || !isFlac(view)) return result;
    
    let offset = 4;
    let isLast = false;
    const uint8 = new Uint8Array(buffer);
    
    while (offset + 4 <= buffer.byteLength && !isLast) {
      const header = view.getUint8(offset);
      isLast = (header & 0x80) !== 0;
      const blockType = header & 0x7F;
      
      const blockSize = (view.getUint8(offset + 1) << 16) | (view.getUint8(offset + 2) << 8) | view.getUint8(offset + 3);
      const blockStart = offset + 4;
      
      if (blockStart + blockSize > buffer.byteLength) {
        break;
      }
      
      if (blockType === 4) {
        // Vorbis Comment Block
        let p = blockStart;
        if (p + 4 <= buffer.byteLength) {
          const vendorLen = view.getUint32(p, true); // little-endian
          p += 4 + vendorLen;
          
          if (p + 4 <= buffer.byteLength) {
            const numComments = view.getUint32(p, true);
            p += 4;
            
            for (let i = 0; i < numComments; i++) {
              if (p + 4 > buffer.byteLength) break;
              const commentLen = view.getUint32(p, true);
              p += 4;
              
              if (p + commentLen > buffer.byteLength) break;
              const commentBytes = uint8.subarray(p, p + commentLen);
              const commentStr = new TextDecoder("utf-8").decode(commentBytes);
              p += commentLen;
              
              const index = commentStr.indexOf('=');
              if (index !== -1) {
                const key = commentStr.slice(0, index).toUpperCase();
                const val = commentStr.slice(index + 1);
                
                if (key === "TITLE") result.title = val;
                else if (key === "ARTIST") result.artist = val;
                else if (key === "ALBUM") result.album = val;
              }
            }
          }
        }
      } else if (blockType === 6) {
        // METADATA_BLOCK_PICTURE
        try {
          let p = blockStart;
          // Skip picture type (4 bytes)
          p += 4;
          
          const mimeLen = view.getUint32(p, false); // big-endian
          p += 4;
          const mimeBytes = uint8.subarray(p, p + mimeLen);
          const mimeType = new TextDecoder("ascii").decode(mimeBytes) || "image/jpeg";
          p += mimeLen;
          
          const descLen = view.getUint32(p, false);
          p += 4 + descLen;
          
          // Skip dimensions: width (4), height (4), depth (4), colors (4)
          p += 16;
          
          const dataLen = view.getUint32(p, false);
          p += 4;
          
          if (p + dataLen <= buffer.byteLength) {
            const picData = uint8.subarray(p, p + dataLen);
            const blob = new Blob([picData], { type: mimeType });
            result.coverUrl = URL.createObjectURL(blob);
          }
        } catch (e) {
          console.error("FLAC image parse failed:", e);
        }
      }
      
      offset = blockStart + blockSize;
    }
  } catch (err) {
    console.error("FLAC parsing exception:", err);
  }
  
  return result;
};

// Sensing audio file duration via a temporary Audio element
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;
    
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
      URL.revokeObjectURL(objectUrl);
    };

    const onLoaded = () => {
      const duration = audio.duration;
      cleanup();
      resolve(isNaN(duration) || !isFinite(duration) ? 180 : duration);
    };

    const onError = () => {
      cleanup();
      resolve(180); // Default fallback of 3 mins
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);
    
    // Safe timeout to prevent hanging
    const timeoutDuration = isAndroid() ? 2000 : 5000;
    setTimeout(() => {
      cleanup();
      resolve(180);
    }, timeoutDuration);
  });
};

// Main exporter
export const readAudioMetadata = async (file: File): Promise<AudioMetadata> => {
  // 1. Resolve duration first asynchronously (in parallel or sequentially)
  const durationPromise = getAudioDuration(file);
  
  // Default values based on filename matching (graceful fallback)
  const nameWithoutExtension = (file.name || "Unknown Track").replace(/\.[^/.]+$/, "");
  let cleanTitle = nameWithoutExtension;
  let cleanArtist = "Local Singer";
  let cleanAlbum = "Local Folder Upload";

  if (file.webkitRelativePath && file.webkitRelativePath.includes('/')) {
    const parts = file.webkitRelativePath.split('/');
    if (parts.length >= 3) {
      cleanArtist = (parts[parts.length - 3] || "Local Singer").trim();
      cleanAlbum = (parts[parts.length - 2] || "Local Folder Upload").trim();
      const rawTitle = (parts[parts.length - 1] || "Untitled").replace(/\.[^/.]+$/, "");
      cleanTitle = rawTitle.replace(/^\d+[\s\-_.]+/, "").trim() || rawTitle || "Untitled";
    } else if (parts.length === 2) {
      cleanArtist = (parts[0] || "Local Singer").trim();
      cleanAlbum = "Folder Release";
      const rawTitle = (parts[1] || "Untitled").replace(/\.[^/.]+$/, "");
      cleanTitle = rawTitle.replace(/^\d+[\s\-_.]+/, "").trim() || rawTitle || "Untitled";
    }
  } else {
    const hyphenParts = nameWithoutExtension.split('-');
    if (hyphenParts.length >= 2) {
      cleanArtist = (hyphenParts[0] || "Local Singer").trim();
      cleanTitle = hyphenParts.slice(1).join('-').trim() || "Untitled";
    } else {
      cleanTitle = nameWithoutExtension || "Untitled";
    }
  }

  let tags: { title?: string; artist?: string; album?: string; coverUrl?: string } = {};

  try {
    // Read the start of the file first to detect header signature
    const headerReader = new FileReader();
    const firstBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      headerReader.onload = () => resolve(headerReader.result as ArrayBuffer);
      headerReader.onerror = () => reject(headerReader.error);
      headerReader.readAsArrayBuffer(file.slice(0, 10));
    });
    
    const headerView = new DataView(firstBytes);
    
    if (isID3(headerView)) {
      // It's an MP3 with ID3v2 tags. Read the full tag size.
      const tagSize = getSynchsafeSize(headerView, 6);
      const safeSize = Math.min(tagSize + 10, Math.min(file.size, 10 * 1024 * 1024)); // clamp to max 10MB to be safe
      
      const tagReader = new FileReader();
      const tagBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        tagReader.onload = () => resolve(tagReader.result as ArrayBuffer);
        tagReader.onerror = () => reject(tagReader.error);
        tagReader.readAsArrayBuffer(file.slice(0, safeSize));
      });
      
      tags = parseID3(tagBuffer);
    } else if (isFlac(headerView)) {
      // It's a FLAC file. Read the first 4MB which normally holds headers.
      const flacHeaderSize = Math.min(file.size, 4 * 1024 * 1024);
      const tagReader = new FileReader();
      const flacBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        tagReader.onload = () => resolve(tagReader.result as ArrayBuffer);
        tagReader.onerror = () => reject(tagReader.error);
        tagReader.readAsArrayBuffer(file.slice(0, flacHeaderSize));
      });
      
      tags = parseFLAC(flacBuffer);
    }
  } catch (e) {
    console.error("Failed parsing metadata for file " + file.name, e);
  }

  const duration = await durationPromise;

  return {
    title: tags.title?.trim() || cleanTitle,
    artist: tags.artist?.trim() || cleanArtist,
    album: tags.album?.trim() || cleanAlbum,
    duration,
    coverUrl: tags.coverUrl
  };
};
