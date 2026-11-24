#!/usr/bin/env python3
"""Génère les icônes PWA (horloge violette/rose) en PNG pur, sans dépendance."""
import math
import os
import struct
import zlib


def chunk(tag, data):
    return (
        struct.pack('>I', len(data))
        + tag
        + data
        + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def make_icon(size, path):
    r = size * 0.18
    cx = cy = size / 2
    ring_r = size * 0.30
    ring_w = size * 0.055
    hand_w = size * 0.028
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            inside = True
            for ccx, ccy in ((r, r), (size - 1 - r, r), (r, size - 1 - r), (size - 1 - r, size - 1 - r)):
                corner = (x < r or x >= size - r) and (y < r or y >= size - r)
                if corner:
                    inside = (x - ccx) ** 2 + (y - ccy) ** 2 <= r * r
                    break
            if not inside:
                raw += bytes((0, 0, 0, 0))
                continue
            t = y / (size - 1)
            cr = int(0x7C + (0xEC - 0x7C) * t)
            cg = int(0x3A + (0x48 - 0x3A) * t)
            cb = int(0xED + (0x99 - 0xED) * t)
            hx, hy = x - cx + 0.5, y - cy + 0.5
            d = math.hypot(hx, hy)
            white = abs(d - ring_r) <= ring_w / 2
            if not white and abs(hx) <= hand_w and -ring_r * 0.55 <= hy <= 0:
                white = True
            if not white and abs(hy) <= hand_w and 0 <= hx <= ring_r * 0.75:
                white = True
            if not white and d <= size * 0.045:
                white = True
            if white:
                cr, cg, cb = 255, 255, 255
            raw += bytes((cr, cg, cb, 255))
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
    os.makedirs(out, exist_ok=True)
    for size in (192, 512):
        p = os.path.join(out, f'icon-{size}.png')
        make_icon(size, p)
        print('OK', p, os.path.getsize(p), 'bytes')
