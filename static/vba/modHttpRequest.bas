Attribute VB_Name = "modHttpRequest"
Option Explicit

Function HttpRequest(url, Optional body = "", Optional user As String = "", Optional pwd As String = "")
    Dim request_body As String, reply_body As String, error_body As String
    request_body = range_to_text(body)
    Call HttpRequestImpl(url, request_body, reply_body, error_body, user, pwd)
    
    If error_body = "" Then
        HttpRequest = text_to_range(reply_body)
    Else
        HttpRequest = text_to_range(error_body)
        HttpRequest(1, 1) = CVErr(xlErrValue)
    End If
    
End Function

Function HttpRequestImpl(url, ByRef request_body As String, ByRef reply_body As String, ByRef error_body As String, user As String, pwd As String)
    On Error GoTo error_handler
    
    Dim xhr
    'Set xhr = CreateObject("WinHttp.WinHttpRequest.5.1")
    'Set xhr = CreateObject("MSXML2.ServerXMLHTTP")
    Set xhr = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    
    'Call xhr.setProxy("2", Environ$("http_proxy"))  ', "<local>")
    
    Dim http_verb: http_verb = IIf(Len(request_body) = 0, "GET", "POST")
    Call xhr.Open(http_verb, url, False, user, pwd)
    
    'Call xhr.setProxyCredentials(Environ$("http_proxy_user"), Environ$("http_proxy_password"))
    
    'xhr.setRequestHeader("myheader", "value")
    If Len(request_body) > 0 Then
        If Left(request_body, 1) = "{" And Right(request_body, 1) = "}" Then
            Call xhr.setRequestHeader("Content-type", "application/json")
        ElseIf Left(request_body, 1) = "[" And Right(request_body, 1) = "]" Then
            Call xhr.setRequestHeader("Content-type", "application/json")
        Else
            Call xhr.setRequestHeader("Content-type", "text/plain")
        End If
    End If
    
    Call xhr.send(request_body)

    ' responseXML.XML, responseText, responseStream or responseBody
    reply_body = xhr.responseText
    
    Set xhr = Nothing
    Exit Function
    
error_handler:
    error_body = "ERROR" & vbNewLine _
        & "URL: " & url & vbNewLine _
        & "ERROR MSG: " & Err.Description & vbNewLine
            
    Set xhr = Nothing
End Function

Function HttpRequestLoop(url, Optional body = "")
    Dim request_body As String, reply_body As String, error_body As String
    request_body = body
    
    Call HttpRequestImpl(url, request_body, reply_body, error_body)
    
    Do While Left(reply_body, 1) = "!" And error_body = ""
        Dim xlfct As String, xlargstr As String, xlargs, xlres
        Dim rpc_return_url, rpc_return_val As String
        rpc_return_url = "http://localhost:8085/rscript_return"
        
        Dim nl1, nl2
        nl1 = InStr(reply_body, Chr(10))
        nl2 = InStr(nl1 + 1, reply_body, Chr(10))
        xlfct = Mid(reply_body, nl1 + 1, nl2 - nl1 - 1)
        xlargstr = Mid(reply_body, nl2 + 1)
        xlargs = json_parse(xlargstr)
        
        xlres = xlfct_run(xlfct, xlargs)
        
        rpc_return_val = "{ ""result"": " & vbs_val_to_json(xlres) & "}"
        Debug.Print "return " & rpc_return_val
        Call HttpRequestImpl(rpc_return_url, rpc_return_val, reply_body, error_body)
    Loop
    
    If error_body = "" Then
        HttpRequestLoop = text_to_range(reply_body)
    Else
        HttpRequestLoop = text_to_range(error_body)
        HttpRequestLoop(1, 1) = CVErr(xlErrValue)
    End If

    Debug.Print "HttpRequestLoop returns " & range_to_text(HttpRequestLoop)

End Function

Function xlfct_run(xlfct, xlargs)
    Dim nbargs: nbargs = UBound(xlargs) - LBound(xlargs) + 1
    Debug.Print "invoke xlfct " & xlfct & " #args=" & nbargs
    
    If nbargs = 0 Then
        xlfct_run = Application.Run(xlfct)
    ElseIf nbargs = 1 Then
        xlfct_run = Application.Run(xlfct, xlargs(0))
    ElseIf nbargs = 2 Then
        xlfct_run = Application.Run(xlfct, xlargs(0), xlargs(1))
    ElseIf nbargs = 3 Then
        xlfct_run = Application.Run(xlfct, xlargs(0), xlargs(1), xlargs(2))
    ElseIf nbargs = 4 Then
        xlfct_run = Application.Run(xlfct, xlargs(0), xlargs(1), xlargs(2), xlargs(3))
    ElseIf nbargs = 5 Then
        xlfct_run = Application.Run(xlfct, xlargs(0), xlargs(1), xlargs(2), xlargs(3), xlargs(4))
    Else
        Dim msg As String
        msg = "rpc_return_val: unsupported number of arguments (" & nbargs & ") in call to " & xlfct & "."
        Debug.Print msg
        Debug.Assert False
        xlfct_run = msg
    End If
End Function

Function text_to_range(txt As String)
    Dim i As Long, j As Long, sep As String, sep2 As String, vec, vec_0, vec_i
    
    sep = Chr$(13) ' vbCr
    sep = vbNewLine
    sep = Chr$(10) ' vbLf
    
    sep2 = vbTab
    
    vec = Split(txt, sep)
    vec_0 = Split(vec(LBound(vec)), sep2)
    
    ReDim rng(LBound(vec) To UBound(vec), LBound(vec_0) To UBound(vec_0))
    For i = LBound(vec) To UBound(vec)
        vec_i = Split(vec(i), sep2)
        For j = LBound(vec_i) To WorksheetFunction.Min(UBound(vec_0), UBound(vec_i))
    
            rng(i, j) = vec_i(j)
            If TypeName(rng(i, j)) = "String" Then
                If Len(rng(i, j)) > 255 Then
                    rng(i, j) = Left(rng(i, j), 253) & ".."
                End If
            End If
        Next j
    Next i
    
    text_to_range = rng
End Function

Function range_to_text(rng)
    Dim txt As String, i As Long, j As Long
    
    If TypeName(rng) = "Range" Then
        rng = rng.Value
    End If
    
    If TypeName(rng) = "Variant()" Then
        For i = LBound(rng) To UBound(rng)
            For j = LBound(rng, 2) To UBound(rng, 2)
                If TypeName(rng(i, j)) = "Date" Then
                    txt = txt & (rng(i, j) * 1)
                Else
                    txt = txt & rng(i, j)
                End If
                If j < UBound(rng, 2) Then txt = txt & vbTab
            Next j
            If i < UBound(rng) Then txt = txt & vbNewLine
        Next i
    Else
        txt = rng
    End If

    range_to_text = txt
End Function

Function range_to_json(rng)
    Dim txt As String, i As Long, j As Long
    
    txt = "["
    For i = LBound(rng) To UBound(rng)
        txt = txt & "["
        For j = LBound(rng, 2) To UBound(rng, 2)
            txt = txt & """" & rng(i, j) & """"
            txt = txt & IIf(j < UBound(rng, 2), ",", "]")
        Next j
        txt = txt & IIf(i < UBound(rng), "," & vbNewLine, "]")
    Next i
    
    range_to_json = txt
End Function

