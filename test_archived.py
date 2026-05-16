import urllib.request, json

r = urllib.request.urlopen('http://localhost:8000/api/fragments/?archived_filter=all')
frags = json.loads(r.read())
if frags:
    f = frags[0]
    fid = f['id']
    print('Test frag:', fid, f['content'][:20])
    # Test PUT with archived=0
    req = urllib.request.Request(
        f'http://localhost:8000/api/fragments/{fid}',
        data=json.dumps({'archived': 0}).encode(),
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    r2 = urllib.request.urlopen(req)
    resp = json.loads(r2.read())
    print('PUT archived=0, status:', r2.status, '| archived in resp:', resp.get('archived'))
else:
    print('No fragments found')