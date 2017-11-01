Attribute VB_Name = "modWbk2Dict"
Option Explicit

Sub export_format_test()
    Dim wbk As Workbook
    Set wbk = ActiveWorkbook
    
    Dim d As Dictionary
    Set d = export_workbook(wbk)
    
    Dim json As String
    json = vbs_dict_to_json(d)
    
    'Debug.Print json
    
    Dim FilePath: FilePath = wbk.FullName & ".json"
    Dim FileNumber: FileNumber = FreeFile
    Open FilePath For Output Access Write As #FileNumber
    Print #FileNumber, json
    Close #FileNumber
    
    Debug.Print FilePath
    
End Sub

Function export_workbook(wbk As Workbook)
    Dim d As Dictionary
    Set d = New Dictionary
    d.Add "LastSaved", Now()
    d.Add "Author", wbk.Author
    d.Add "Name", wbk.name
    d.Add "CodeName", wbk.CodeName
    d.Add "HasVBProject", wbk.HasVBProject
    d.Add "#Styles", wbk.Styles.Count
    'wbk.Colors
    
    Call d.Add("Names", export_names(wbk.names))
    
    'ReDim sht_array(1 To wbk.Sheets.Count) As Dictionary
    Dim sht_list: Set sht_list = CreateObject("System.Collections.ArrayList")
    
    Dim sht_pos As Long
    Dim sht As Worksheet
    For Each sht In wbk.Sheets
        sht_pos = sht_pos + 1
        'Set sht_array(sht_pos) = export_worksheet(sht)
        sht_list.Add export_worksheet(sht)
    Next sht
    'Call d.Add("Worksheets", sht_array)
    Call d.Add("Worksheets", sht_list)
    
    Set export_workbook = d
End Function


Function export_worksheet(sht As Worksheet)
    sht.Select
    sht.Activate
    
    Dim d As Dictionary
    Set d = New Dictionary
    
    d.Add "Name", sht.name
    d.Add "CodeName", sht.CodeName
    d.Add "Visible", sht.Visible
    d.Add "DisplayGridlines", ActiveWindow.DisplayGridlines
    'd.Add "CodeName", sht.Columns
    
    Call d.Add("formulas", export_worksheet_formulas(sht))
    Call export_worksheet_format(d, sht)
    
    Set export_worksheet = d
End Function


Function export_names(nms As names)
    If nms.Count = 0 Then Exit Function
    
    Dim names_dict As Dictionary
    Set names_dict = New Dictionary
    
    Dim nm As name
    For Each nm In nms
        
        ' Naive implementation: stores Worksheet and Name together separated by "!"
        ' names_dict.Add nm.name, nm.RefersTo
        
        
        ' Is it a WorkSheet name ? If so, ask Excel to extract it
        Dim nm_sheet As String, nm_bare As String
        Dim nm_sheet_ends: nm_sheet_ends = InStrRev(nm.name, "!", , vbBinaryCompare)
        If nm_sheet_ends > 0 Then
            ' does not work when RefersTo is not a Range address (e.g. a formula)
            'nm_sheet = Range(nm.name).Worksheet.name
            nm_sheet = Range(Left(nm.name, nm_sheet_ends) & "A1").Worksheet.name
            nm_bare = Mid(nm.name, nm_sheet_ends + 1)
        Else
            nm_sheet = ""
            nm_bare = nm.name
        End If
        
        If Not names_dict.Exists(nm_sheet) Then
            names_dict.Add nm_sheet, New Dictionary
        End If
        names_dict.Item(nm_sheet).Add nm_bare, nm.RefersTo ' nm.RefersTo or nm.RefersToR1C1
        
        ' Check whether we loose Named range comment
        Debug.Assert nm.Comment = ""
    Next
    
    Set export_names = names_dict
End Function

Function export_worksheet_formulas(sht As Worksheet)
    
    Dim last_cell As Range, last_row As Long, last_col As Long
    Set last_cell = sht.Cells.SpecialCells(xlCellTypeLastCell)
    last_row = last_cell.Row
    last_col = last_cell.Column
    
    Dim formulas As Dictionary: Set formulas = New Dictionary
    
    Dim i As Long, i2 As Long, j As Long, ic As Long, c As Range, c2 As Range
    Dim already_done_address As Dictionary
    Set already_done_address = New Dictionary
    
    ' Formulas
    For i = 1 To last_row
        For j = 1 To last_col
            
            Set c = sht.Cells(i, j)
            
            If already_done_address.Exists(c.Address) Then
                GoTo next_cell
            End If
            
            If c.HasArray Then
                formulas(c.CurrentArray.Address) = "{" & c.FormulaArray & "}"
            ElseIf c.HasFormula Then
                For i2 = i + 1 To last_row + 1
                    Set c2 = sht.Cells(i2, j)
                    If c.FormulaR1C1 <> c2.FormulaR1C1 Then
                        Exit For
                    Else
                        already_done_address.Add c2.Address, True
                    End If
                Next
                If i2 - i = 1 Then
                    formulas(c.Address) = c.formula
                Else
                    formulas(c.Address & ":" & c2.Address) = c.formula
                End If
            ElseIf Not IsEmpty(c.Value) Then
                For i2 = i + 1 To last_row + 1
                    Set c2 = sht.Cells(i2, j)
                    If c.Value <> c2.Value Then
                        Exit For
                    Else
                        already_done_address.Add c2.Address, True
                    End If
                Next
                If i2 - i = 1 Then
                    formulas(c.Address) = c.Value
                Else
                    formulas(c.Address & ":" & c2.Address) = c.Value
                End If
            Else
                'GoTo next_formula_cell
            End If
next_cell:
        Next
    Next
    
    Set export_worksheet_formulas = formulas
End Function

Function export_worksheet_format(d As Dictionary, sht As Worksheet)
    Dim last_cell As Range, last_row As Long, last_col As Long
    Set last_cell = sht.Cells.SpecialCells(xlCellTypeLastCell)
    last_row = last_cell.Row
    last_col = last_cell.Column
    
    ReDim formats(1 To last_row * last_col) As Dictionary
    
    Dim i As Long, j As Long, i0 As Long, i1 As Long, i2 As Long, ic As Long, c As Range, c2 As Range
    Dim already_done_address As Dictionary
    Set already_done_address = New Dictionary
    
    ' Format
    ' remember previous cell address, format and format JSON
    For j = 1 To last_col
        For i0 = 1 To last_row
        
            If already_done_address.Exists(sht.Cells(i0, j).Address) Then
                GoTo next_cell
            End If
            
            For i1 = i0 To last_row + 1
            
                Set c = sht.Cells(i1, j)
                
                Dim cd As Dictionary, css As String, class As String, tmp
                Set cd = New Dictionary: css = "": class = ""
                           
                ' Test color with vbBlack/vbWhite or ColorIndex with 0/1
                ' Special color indices:
                ' xlColorIndexAutomatic: -4105
                ' xlColorIndexNone: -4142
                If c.Font.ColorIndex <> xlColorIndexAutomatic And c.Font.ColorIndex <> xlColorIndexNone And c.Font.Color <> vbBlack Then
                    cd("color") = "#" & color_to_rgb_string(c.Font.Color)
                    'cd("color-index") = c.Font.ColorIndex
                End If
                If c.Interior.ColorIndex <> xlColorIndexAutomatic And c.Interior.ColorIndex <> xlColorIndexNone And c.Interior.Color <> vbWhite Then
                    cd("background-color") = "#" & color_to_rgb_string(c.Interior.Color)
                    'cd("background-color-index") = c.Interior.ColorIndex
                End If
                
                
                If c.Font.FontStyle <> "Regular" Then
                    class = class & LCase(c.Font.FontStyle) & " "
                End If
                'If c.Font.Bold Then class = class & "bold "
                'If c.Font.Italic Then class = class & "italic "
                If c.Font.Underline <> xlUnderlineStyleNone Then class = class & "underline "
                
                tmp = c.HorizontalAlignment
                If tmp = xlCenter Then class = class & "center "
                If tmp = xlDistributed Then class = class & "distributed "
                If tmp = xlJustify Then class = class & "justify "
                If tmp = xlLeft Then class = class & "left "
                If tmp = xlRight Then class = class & "right "
                
                ' xlBordersIndex constants: xlDiagonalDown, xlDiagonalUp, xlEdgeBottom, xlEdgeLeft, xlEdgeRight, or xlEdgeTop, xlInsideHorizontal, or xlInsideVertical.
                If c.Borders(xlEdgeTop).LineStyle <> xlLineStyleNone Then class = class & "border-top "
                'If c.Borders(xlEdgeBottom).LineStyle <> xlLineStyleNone Then class = class & "border-bottom "
                If c.Borders(xlEdgeLeft).LineStyle <> xlLineStyleNone Then class = class & "border-left "
                'If c.Borders(xlEdgeBottom).LineStyle <> xlLineStyleNone Then class = class & "border-right "
                
                ' Number format
                If c.NumberFormat <> "General" Then
                    If c.NumberFormat = "d-mmm-yy" Then
                        cd("NumberFormat") = "dd-mmm-yyyy"
                    Else
                        cd("NumberFormat") = c.NumberFormat
                    End If
                End If
                
                If css <> "" Then cd("css") = Trim(css)
                If class <> "" Then cd("class") = Trim(class)
                
                
                
                Dim begin_fmt_json As String, curr_fmt_json As String
                Dim begin_fmt As Dictionary
                Dim bFmt As Boolean
                
                curr_fmt_json = vbs_dict_to_json(cd)
                bFmt = curr_fmt_json <> "{}"
                
                If i0 = i1 Then
                    If Not bFmt Then
                        ' first cell, no format
                        Exit For
                    Else
                        ' first cell, format
                        Set begin_fmt = cd
                        begin_fmt_json = curr_fmt_json
                    End If
                ElseIf begin_fmt_json <> curr_fmt_json Then
                    ' past last cell format
                    If i1 - i0 = 1 Then
                        begin_fmt("range") = sht.Cells(i0, j).Address
                        ic = ic + 1
                        Set formats(ic) = begin_fmt
                    Else
                        begin_fmt("range") = Range(sht.Cells(i0, j), sht.Cells(i1 - 1, j)).Address
                        ic = ic + 1
                        Set formats(ic) = begin_fmt

                    End If
                    Exit For
                Else
                    ' repeat format
                    already_done_address.Add sht.Cells(i1, j).Address, True
                End If
                    
            Next i1
            
next_cell:

        Next i0
    Next j
    
    ReDim Preserve formats(1 To IIf(ic > 0, ic, 1))
    
    d.Add "formats", formats
    
End Function

Function color_to_rgb_string(c)
    'c = RGB(255, 128, 0)
    
    ' This produces GreenRedBlue colors
    'Debug.Print "BGR   #" & Hex(c)
    
    ' So we must do it the hard way
    
    Dim r, g, b
    r = c And 255
    g = ((c - r) / 256) And 255
    b = ((c - r - 256 * g) / 65536) And 255

    r = Hex(r)
    g = Hex(g)
    b = Hex(b)
    
    'Debug.Print "Red   #" & r
    'Debug.Print "Green #" & g
    'Debug.Print "Blue  #" & b
    
    Dim txt As String
    txt = IIf(Len(r) = 1, "0", "") & r _
        & IIf(Len(g) = 1, "0", "") & g _
        & IIf(Len(b) = 1, "0", "") & b
    'Debug.Print "RGB   #" & txt
    
    color_to_rgb_string = txt
End Function

Function test_color_index()
    Dim x
    x = RGB(255, 128, 1)
    Debug.Print "Red-ish", color_to_rgb_string(x)
    
    Dim color_index As Long
    For color_index = 1 To 56
        x = ActiveWorkbook.Colors(color_index)
        Debug.Print "color " & color_index & " : " & color_to_rgb_string(x) & " (" & x; ")"
    Next color_index
    
End Function
