# Azyume render-service isolation

The Azyume video-editing renderer is a dedicated local service. It must not reuse or restart the NihongoMethodID YouTube render server.

## Production identities

| Component | Identity |
|---|---|
| Azyume web | PM2 `azyume-web`, `127.0.0.1:3000` |
| Azyume queue worker | PM2 `azyume-worker`, Redis database 1 |
| Azyume video renderer | PM2 `azyume-render-service`, `127.0.0.1:4100` |
| Azyume renderer directory | `/opt/azyume-render-service` |
| Azyume render state | `/var/lib/azyume-render-service/jobs` |
| Azyume temporary renders | `/tmp/azyume-remotion-renders` |
| Azyume object storage | R2 bucket `azyumecutai` |
| WMP | `127.0.0.1:4000` |
| NihongoMethodID renderer | Existing separately managed render server and n8n workflow |

The Azyume renderer binds only to localhost and does not need an n8n workflow or public reverse proxy. The Azyume app and renderer share an Azyume-only `RENDER_SERVICE_SECRET`.

The renderer source may be cloned from the same reusable code repository, but its runtime directory, PM2 process, port, environment, secret, state, temporary files, and R2 bucket remain independent from NihongoMethodID.
