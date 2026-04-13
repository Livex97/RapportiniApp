#!/usr/bin/env python3
import sys
import json
import openpyxl
import os

def find_sheet(wb, type_hint):
    """Cerca il foglio corretto basandosi sul tipo (pandetta o sterlink)."""
    if type_hint == 'pandetta':
        # Cerca fogli che contengono "PANDETTA" nel nome
        for sheet_name in wb.sheetnames:
            if "PANDETTA" in sheet_name.upper():
                return wb[sheet_name]
    elif type_hint == 'sterlink':
        # Sterlink di solito ha un solo foglio o il primo
        return wb.active
    
    # Fallback al primo foglio
    return wb.active

def main():
    if len(sys.argv) < 3:
        print("Usage: read_excel.py <file_path> <type_hint>", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]
    type_hint = sys.argv[2]

    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}", file=sys.stderr)
        sys.exit(1)

    try:
        # Carica solo dati (data_only=True per risolvere le formule)
        wb = openpyxl.load_workbook(file_path, data_only=True)
        ws = find_sheet(wb, type_hint)
        
        # Estrai intestazioni (riga 1)
        header_cells = list(ws.iter_rows(min_row=1, max_row=1, values_only=True))[0]
        headers = [str(h).strip() if h else f"Colonna{i+1}" for i, h in enumerate(header_cells)]
        
        rows = []
        # Estrai dati (dalla riga 2 in poi)
        for row_cells in ws.iter_rows(min_row=2, values_only=True):
            # Salta righe completamente vuote
            if all(c is None for c in row_cells):
                continue
            
            row_dict = {}
            for i, val in enumerate(row_cells):
                if i < len(headers):
                    # Formatta valori (es. date in stringhe ISO)
                    from datetime import datetime
                    if isinstance(val, datetime):
                        val = val.strftime('%Y-%m-%d')
                    row_dict[headers[i]] = val
            rows.append(row_dict)

        # Output strutturato: colonne ordinate e righe
        output_data = {
            "columns": headers,
            "rows": rows
        }
        print(json.dumps(output_data))
        
    except Exception as e:
        print(f"Error reading excel: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
