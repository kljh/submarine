Attribute VB_Name = "modODBC"
Option Explicit

' References:
' Microsoft ActiveX Data Object
' Microsoft ADO Ext

' Security:
' Outlook / Options / Trust Center / Macro Settings / Notification for all Macros

' Docs:
' https://docs.microsoft.com/en-us/sql/ado/reference/ado-api/execute-requery-and-clear-methods-example-vb

' Types:
' VARCHAR(size) or TEXT : Text.
' DATETIME or TIMESTAMP : A date and time combination. TIMESTAMP values are stored as the number of seconds since the Unix epoch.
' DOUBLE or LONG

Sub ODBCTest()
    Dim db
    Set db = ODBCCreateMDBConnection()

    Call ODBCCreateTable(db, "data", "( id AUTOINCREMENT PRIMARY KEY, surname TEXT(10), city TEXT(10) )", True)
    Call ODBCFillTableTest(db, "data")
    
    Dim tmp, tmp2
    tmp = ODBCExecuteCmd(db, "select * from data")
    tmp2 = ODBCExecuteCmd(db, "select surname, sum(id) from data group by surname")
    
    db.Close: Set db = Nothing

End Sub

Function VBSQL(data, SQLCmd As String, Optional schema As String)
    ' Make sure data is a table (not a Range)
    On Error Resume Next
    data = data.Value
    On Error GoTo 0

    ' Open a database connection
    Dim db
    Set db = ODBCCreateMDBConnection()

    ' Define table structure
    Dim i, j, vba_type_name, sql_type_name
    For i = LBound(data) To UBound(data)
        For j = LBound(data, 2) To UBound(data, 2)
            If TypeName(data(i, j)) = "Date" Then
                data(i, j) = 1 * data(i, j)
            End If
        Next j
    Next i
    If schema = "" Then
        For j = LBound(data, 2) To UBound(data, 2)
            vba_type_name = TypeName(data(2, j))
            If vba_type_name = "Date" Or vba_type_name = "Double" Then
                sql_type_name = "DOUBLE"
            Else
                sql_type_name = "TEXT"
            End If
            schema = schema & ", " & data(LBound(data), j) & " " & sql_type_name
        Next j
        schema = "( " & Mid(schema, 2) & " )"
    End If
    Call ODBCCreateTable(db, "data", schema, True)
    
    ' Fill table
    Call ODBCFillTable2d(db, "data", data)
    
    ' Execute query
    VBSQL = ODBCExecuteCmd(db, SQLCmd)
End Function

Function ODBCCreateMDBConnection( _
    Optional mdb As String = "C:\temp\jetdb.mdb" _
)
    If Len(Dir(mdb)) = 0 Then
        Dim ctlg
        Set ctlg = New ADOX.Catalog
        ctlg.Create "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & mdb
    End If
    
    Dim cn As New ADODB.Connection
    cn.Provider = "Microsoft.Jet.OLEDB.4.0"
    'cn.ConnectionString = ...
    
    ' Added line for disconnected recordset (e.g. RecordCount)
    cn.CursorLocation = adUseClient
        
    cn.Open mdb
    Set ODBCCreateMDBConnection = cn
End Function

Sub ODBCCreateTable(cn, _
    Optional tbl As String = "data", _
    Optional schema As String = " ( id AUTOINCREMENT PRIMARY KEY, surname TEXT(10), city TEXT(10) ) ", _
    Optional bDropTable As Boolean = True _
)
    If bDropTable Then
        On Error Resume Next
        cn.Execute "drop table " & tbl & ""
        On Error GoTo 0
    End If
    cn.Execute "create table " & tbl & " " & schema
End Sub

Function ODBCExecuteCmd(cn, sql_cmd)
    Dim rs As New ADODB.Recordset
    Set rs = cn.Execute(sql_cmd)
    Dim i%, j%, nl%, nh%, ml%, mh%
    ml% = 1
    mh% = rs.fields.Count
    
    ' If we couldn't tell number of rows in the results table, we could have used an ArrayList
    'Dim rows: Set rows = CreateObject("System.Collections.ArrayList")
    
    'rs.MoveLast
    nh% = rs.RecordCount
    'rs.MoveFirst
    
    ' Display headers
    ReDim header$(ml% To mh%)
    ReDim data(nl% To nh%, ml% To mh%)
    For j% = 1 To mh%
        header$(j%) = rs.fields(j% - 1).Name
        data(0, j%) = rs.fields(j% - 1).Name
    Next
    Debug.Print Join(header$, ",")
    
    i% = 0
    Do Until rs.EOF
        i% = i% + 1
        For j% = ml% To mh%
            data(i%, j%) = rs.fields.Item(j% - 1)
        Next
        rs.MoveNext
    Loop
    'ReDim Preserve data(0 To i%, ml% To mh%)
    
    rs.Close: Set rs = Nothing
    ODBCExecuteCmd = data
End Function

Sub ODBCFillTable2d(cn, tbl, data)
    Dim rs As New ADODB.Recordset
    rs.Open tbl, cn, adOpenDynamic, adLockOptimistic, adCmdTableDirect
    
    ' Add records to the table.
    Dim i&, j&, nl&, nh&, ml&, mh& ' flt#
    nl& = LBound(data)
    nh& = UBound(data)
    ml& = LBound(data, 2)
    mh& = UBound(data, 2)
    
    For i& = nl& + 1 To nh
        rs.AddNew
        For j& = ml& To mh
            rs.fields(data(nl&, j&)).Value = data(i&, j&)
        Next
        On Error Resume Next
        rs.Update
        On Error GoTo 0
    Next
    
    On Error Resume Next
    rs.Close
    On Error GoTo 0
End Sub


Sub ODBCFillTable(cn, tbl, data)
    Dim rs As New ADODB.Recordset
    rs.Open tbl, cn, adOpenDynamic, adLockOptimistic, adCmdTableDirect
    
    ' Add records to the table.
    Dim i&, j&, nl&, nh&, ml&, mh& ' flt#
    nl& = LBound(data)
    nh& = UBound(data)
    'ml& = LBound(data, 2)
    'mh& = UBound(data, 2)
    ml& = LBound(data(0))
    mh& = UBound(data(0))
    For i& = nl& + 1 To nh
        rs.AddNew
        For j& = ml& To mh
            'rs.fields(data(nl&, j&)).Value = data(i&, j&)
            rs.fields(data(nl&)(j&)).Value = data(i&)(j&)
        Next
        On Error Resume Next
        rs.Update
        On Error GoTo 0
    Next
    
    On Error Resume Next
    rs.Close
    On Error GoTo 0
End Sub

Sub ODBCFillTableTest(cn, tbl)
    
    cn.Execute "insert into " & tbl & " ( surname, city ) VALUES ( 'cc', 'Paris' )"
    cn.Execute "insert into " & tbl & " ( surname, city ) VALUES ( 'tk', 'London' )"
    cn.Execute "insert into " & tbl & " ( surname, city ) VALUES ( 'gc', 'Lisbon' )"
    
    Dim tmp
    tmp = Array(Array("surname", "city"), Array("ag", "Tokyo"), Array("fr", "NY"))
    'Call ODBCFillTable(cn, tbl, tmp)
    
    ' Dim rs As New ADODB.Recordset
    ' rs.Open tbl, cn, adOpenDynamic, adLockOptimistic, adCmdTableDirect
    ' rs.Find ...
    ' Debug.Print "#records found : ", rs.RecordCount
    ' rs.Close
    
End Sub
