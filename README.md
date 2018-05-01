
A simple Web server with Single Sign On (SSO), WebDAV, publish-subscribe based on Websocket.


# Authentication

Two authentication methods are supported:

* Single Sign On (SSO) using Kerberos/SSPI
  This is automatic and transparent but relies on the machines (desktops and servers) to be properly configured.
  
* LDAP directory
  This is more portable but more requires UID and password to be sent.
  
* HTTP GET request on `/` opens a login prompt.  
  HTTP GET request on `/login` returns a JSON with authentication details.  
  HTTP GET request on `/logout` close the session (and associated authentication details).
  
  Next: 
  - use HTTP session (require Cookies) ?
  - use OAuth-style authentication tokens ?
  - how to create sessions ? application/x-www-form-urlencoded or json or HTTP headers or URL query ?
  

Example of HTTP GET request on `/login`:
```sh
{
    "sspi": {
        "user": "ZenBook\\kljh"
    },
    "ldap": {
        "dn": "cn=kljh",
        "sn": "Dexter McCormick",
        "cn": "Dexter McCormick Katharine",
    },
    "client_address": {
        "host": "10.224.72.131",
        "port": 53691
    }, 
    "token": " ***** to do ***** "
}
```

# Logging / Audit

All requests are logged.

*to do: option to log rotate if log size becomes an issue ?* 

# Fair-use of resources

At first, we rely on NodeJS/Redis built in mechanism for queuing request. It means a strict first-in first-out.

We'll put in place a fair-use queuing where the calculation resources are share evenly between users and where people with fewer requests are given higher priority.

Next: 
- Should we use user id ? Pros: simpler. Cons: same user may run a high priority interactive query and a low priority background batch.
- Should we use session id ? Pros: would allow cancelation. Cons: more complex and can be arbitraged (create many sessions to get more resources)


# Publish-Subscribe

This is a simple application of WebSockets. 

A client can subscribe to updates on a given topic sending this message over a WebSocket:

```sh
{
    "type": "subscribe", 
    "topic": "sudden_idea_notification"
}
```

And another client can publish on the topic (either over WebSocket or normal HTTP request *todo for http*):

```sh
{
    "type": "publish", 
    "topic": "sudden_idea_notification",
    "id": "cmoi@yahoo.co.jp",
    "txt": "Trade idea: buy low, sell high",
    "data_url" : "--- for attachements ---"
}
```

Then all subscribers receive a copy of the published message(s).

**Application**: broadcast notifications.

**Limitations**: only people connected at the time the message is published will receive a copy.  WebSockets can easily disconnect and reconnect, there is no strong guarantee of delivery.

# Queue push-pop

This is a thin wrapper around Redis PUSH/POP queues.

A client can push to a given queue:

```sh
{
    "type": "queue_push", 
    "queue_name": "calculation_request",
    "msg": { ... }

}
```

Another task can pop message from the queue.  
The call is blocking if the `timeout` is not zero.

```sh
{
    "type": "queue_pop", 
    "queue_name": "calculation_request",
    "timeout": 60000
}
```

**Application**: request queue.

**Guarantees/Limitations**: 

Each message is delivered only once (e.g. only one client receives it even if multiple clients are connected and available to pop from the queue). 

Redis cache is responsible to manage the queue. Messages won't be lost unless Redis server is restarted or runs out of memory. When Redis reclaims memory, oldest entries are dumped first.


# HTTP request

Browsers are limited to about half a dozen concurrent requests to a given host. 
Delegating request to a WebSocket server should allow us to bypass this limitation.

**Limitation**: server also has maximum number of concurrent request. This should be configurable server side with `http.globalAgent.maxSockets = 50;` but this has not been tested yet.

```sh
{
    "type": "http_request", 
    "[url]": "url to call, defaults to URL for UAT calculation grid",
    "[body]": {
        "request_name": "host_info",
        "request_id": "it is your responsability to add some request id to match your questions zith your replies",
        "comment": "if no body is supplied we do a GET request, otherwise it is a POST request"
    } 
}
```



# Other commands

A limited set of pre-defined commands  like posting to MQ (by invoking a command line server side) can also be performed. 

*to document* 



  
  

