from __future__ import annotations

from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

import pandas as pd


MAIN_NS = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def _column_index(cell_reference: str) -> int:
    letters = ''.join(ch for ch in cell_reference if ch.isalpha())
    index = 0
    for char in letters:
        index = index * 26 + (ord(char.upper()) - 64)
    return max(index - 1, 0)


def _load_shared_strings(archive: ZipFile) -> list[str]:
    if 'xl/sharedStrings.xml' not in archive.namelist():
        return []

    root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
    values: list[str] = []
    for item in root.findall('a:si', MAIN_NS):
        parts = [node.text or '' for node in item.iterfind('.//a:t', MAIN_NS)]
        values.append(''.join(parts))
    return values


def _extract_cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get('t')
    inline = cell.find('a:is', MAIN_NS)
    if inline is not None:
        return ''.join(node.text or '' for node in inline.iterfind('.//a:t', MAIN_NS))

    value_node = cell.find('a:v', MAIN_NS)
    if value_node is None or value_node.text is None:
        return ''

    raw_value = value_node.text
    if cell_type == 's' and shared_strings:
        return shared_strings[int(raw_value)]
    return raw_value


def read_excel_flexible(path: str | Path) -> pd.DataFrame:
    file_path = Path(path)
    try:
        return pd.read_excel(file_path)
    except Exception:
        pass

    with ZipFile(file_path) as archive:
        shared_strings = _load_shared_strings(archive)
        sheet_names = [name for name in archive.namelist() if name.startswith('xl/worksheets/sheet') and name.endswith('.xml')]
        if not sheet_names:
            raise ValueError(f'No worksheet found in {file_path}')

        sheet_root = ET.fromstring(archive.read(sheet_names[0]))
        rows = []
        for row in sheet_root.find('a:sheetData', MAIN_NS).findall('a:row', MAIN_NS):
            values = {}
            for cell in row.findall('a:c', MAIN_NS):
                ref = cell.attrib.get('r', '')
                values[_column_index(ref)] = _extract_cell_value(cell, shared_strings)

            if not values:
                continue

            max_index = max(values.keys())
            rows.append([values.get(index, '') for index in range(max_index + 1)])

    if not rows:
        return pd.DataFrame()

    headers = [str(value).strip() or f'column_{idx}' for idx, value in enumerate(rows[0])]
    data_rows = rows[1:]
    width = len(headers)
    normalized = []
    for row in data_rows:
        if len(row) < width:
            row = row + [''] * (width - len(row))
        elif len(row) > width:
            row = row[:width]
        normalized.append(row)

    frame = pd.DataFrame(normalized, columns=headers)
    return frame.replace({'': pd.NA})


def dataframe_to_excel_bytes(frame: pd.DataFrame) -> bytes:
    buffer = BytesIO()
    frame.to_excel(buffer, index=False)
    return buffer.getvalue()
