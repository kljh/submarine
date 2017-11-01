Attribute VB_Name = "modHttpRequest"
Option Explicit

Sub f(ByRef a As String)
    a = "flkj"
End Sub
Sub sdakj()
    Dim s As String
    Call f(s)
    Debug.Print s
    
End Sub
Function HttpRequest(url, Optional body = "")
    Dim request_body As String, reply_body As String, error_body As String
    request_body = body
    Call HttpRequestImpl(url, request_body, reply_body, error_body)
    
    If error_body = "" Then
        HttpRequest = text_to_range(reply_body)
    Else
        HttpRequest = text_to_range(error_body)
        HttpRequest(1, 1) = CVErr(xlErrValue)
    End If
    
End Function

Function HttpRequestImpl(url, ByRef request_body As String, ByRef reply_body As String, ByRef error_body As String)
    On Error GoTo error_handler
    
    Dim xhr
    'Set xhr = CreateObject("WinHttp.WinHttpRequest.5.1")
    'Set xhr = CreateObject("MSXML2.ServerXMLHTTP")
    Set xhr = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    
    'Call xhr.setProxy("2", Environ$("http_proxy"))  ', "<local>")
    
    Dim http_verb: http_verb = IIf(Len(request_body) = 0, "GET", "POST")
    Call xhr.Open(http_verb, url, False)
    
    'Call xhr.setProxyCredentials(Environ$("http_proxy_user"), Environ$("http_proxy_password"))
    
    'xhr.setRequestHeader("myheader", "value")
    If Len(request_body) > 0 Then
        If Left(request_body, 1) = "{" And Right(request_body, 1) = "}" Then
            Call xhr.setRequestHeader("Content-type", "application/json")
        End If
        If Left(request_body, 1) = "[" And Right(request_body, 1) = "]" Then
            Call xhr.setRequestHeader("Content-type", "application/json")
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
    Dim i, sep As String, vec
    
    sep = Chr$(13) ' vbCr
    sep = vbNewLine
    sep = Chr$(10) ' vbLf
    
    vec = Split(txt, sep)
    
    ReDim rng(LBound(vec) To UBound(vec), 0 To 0)
    For i = LBound(vec) To UBound(vec)
        rng(i, 0) = vec(i)
        If TypeName(vec(i)) = "String" Then
            If Len(vec(i)) > 255 Then
                rng(i, 0) = Left(vec(i), 253) & ".."
            End If
        End If
    Next i
    
    text_to_range = rng
End Function

Function range_to_text(rng)
    Dim txt As String, i As Long, j As Long
    
    For i = LBound(rng) To UBound(rng)
        For j = LBound(rng, 2) To UBound(rng, 2)
            txt = txt & rng(i, j)
            If j < UBound(rng, 2) Then txt = txt & vbTab
        Next j
        If i < UBound(rng) Then txt = txt & vbNewLine
    Next i
    
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

