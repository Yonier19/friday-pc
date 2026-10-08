import zlib
import struct
import math
import os

def create_orb_png(width=256, height=256):
    raw_data = bytearray()
    cx, cy = width / 2.0, height / 2.0
    r_max = width * 0.48

    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            dx = x - cx
            dy = y - cy
            dist = math.hypot(dx, dy)
            
            # Base dark obsidian background
            if dist > r_max:
                # Transparent outside
                raw_data.extend([0, 0, 0, 0])
                continue
            
            # Outer cyan border ring
            if abs(dist - r_max * 0.95) < 2.0:
                raw_data.extend([0, 242, 254, 230])
                continue

            # Outer tech dashed ring (approx)
            angle = math.atan2(dy, dx)
            if abs(dist - r_max * 0.75) < 1.8:
                dash = int((angle + math.pi) * 8) % 2
                if dash == 0:
                    raw_data.extend([0, 242, 254, 200])
                    continue

            # Inner purple ring
            if abs(dist - r_max * 0.6) < 1.6:
                dash2 = int((angle + math.pi) * 12) % 2
                if dash2 == 0:
                    raw_data.extend([157, 78, 221, 190])
                    continue

            # Core glowing reactor
            core_dist = dist / (r_max * 0.42)
            if core_dist < 1.0:
                # Gradient from white to cyan to purple to dark
                factor = 1.0 - core_dist
                r = int(255 * factor + 5 * (1 - factor))
                g = int(255 * (factor**1.5) + 242 * (1 - factor) * 0.5)
                b = int(255 * factor + 254 * (1 - factor))
                a = 255
                raw_data.extend([min(255, r), min(255, g), min(255, b), a])
                continue

            # Intermediate space gradient
            halo_factor = max(0.0, 1.0 - (dist - r_max * 0.4) / (r_max * 0.55))
            r = int(11 * halo_factor + 5)
            g = int(25 * halo_factor + 8)
            b = int(55 * halo_factor + 17)
            a = int(240 * halo_factor + 220)
            raw_data.extend([r, g, b, min(255, a)])

    # Construct PNG file
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(bytes(raw_data), 9))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

def create_ico(png_data):
    # ICONDIR: idReserved (2), idType (2 = 1 for icon), idCount (2 = 1)
    icondir = struct.pack('<HHH', 0, 1, 1)
    # ICONDIRENTRY: bWidth (1), bHeight (1, 0 for 256), bColorCount (1), bReserved (1),
    # wPlanes (2), wBitCount (2), dwBytesInRes (4), dwImageOffset (4)
    # 256x256 is encoded as 0, 0
    header_size = 6 + 16
    entry = struct.pack('<BBBBHHII', 0, 0, 0, 0, 1, 32, len(png_data), header_size)
    return icondir + entry + png_data

if __name__ == '__main__':
    build_dir = os.path.join(os.path.dirname(__file__), '..', 'build')
    os.makedirs(build_dir, exist_ok=True)
    
    png_bytes = create_orb_png(256, 256)
    ico_bytes = create_ico(png_bytes)

    with open(os.path.join(build_dir, 'icon.png'), 'wb') as f:
        f.write(png_bytes)
    with open(os.path.join(build_dir, 'icon.ico'), 'wb') as f:
        f.write(ico_bytes)

    print(f"Generated build/icon.png ({len(png_bytes)} bytes) and build/icon.ico ({len(ico_bytes)} bytes)")
