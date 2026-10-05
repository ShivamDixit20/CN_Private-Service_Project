# CN Private Service Project — Phase 1: Build & Observe

## 1. Overview

This Phase 1 project builds and observes a private web service across four physical macOS laptops connected to the same LAN. The system combines private DNS, two backend servers, an nginx edge server, round-robin load balancing, TLS termination through a locally trusted certificate authority, response caching, packet inspection, and controlled failure testing.

The project is intended to demonstrate both how the service works and what its DNS, TCP, TLS, caching, and failure behavior looks like on the network. Evidence collected during the completed experiments belongs under `evidence/`; this repository does not claim results that have not yet been captured and verified.

## 2. Team Members

| Team member | Enrollment number | Responsibility |
| --- | --- | --- |
| Shitanshu | `<ENROLLMENT_NUMBER>` | Primary DNS |
| Keshav | `<ENROLLMENT_NUMBER>` | nginx edge server, load balancing, TLS termination, and caching |
| Shivam | `<ENROLLMENT_NUMBER>` | Backend A |
| Yash | `<ENROLLMENT_NUMBER>` | Backend B |

## 3. Architecture

All four macOS laptops are connected to the same private LAN. Clients resolve the private service names through Shitanshu's DNS server. Requests then reach the nginx edge server on Keshav's laptop, which terminates TLS when HTTPS is used and proxies traffic to Backend A or Backend B in round-robin order.

```text
LAN client
    |
    | DNS query: app.team1.test / api.team1.test
    v
Primary DNS — Shitanshu (10.7.22.96, dnsmasq)

LAN client
    |
    | HTTP :8080 or HTTPS :8443
    v
nginx edge — Keshav (10.7.15.28)
    |                         |
    | round-robin             | round-robin
    v                         v
Backend A                  Backend B
Shivam                     Yash
10.7.9.199:3001            10.7.1.235:3002
```

Private service domains:

- `app.team1.test`
- `api.team1.test`

Edge ports:

- HTTP: `8080`
- HTTPS: `8443`

## 4. Machine/IP/Role Table

| Team member | LAN IP | Service/port | Role |
| --- | --- | --- | --- |
| Shitanshu | `10.7.22.96` | DNS (`dnsmasq`) | Primary DNS for the private domains |
| Keshav | `10.7.15.28` | HTTP `8080`, HTTPS `8443` | nginx reverse proxy, round-robin load balancer, TLS termination, and cache |
| Shivam | `10.7.9.199` | Backend A `3001` | First application backend |
| Yash | `10.7.1.235` | Backend B `3002` | Second application backend |

## 5. Repository Structure

```text
CN_Private-Service_Project/
├── backend-a/             # Backend A source and non-secret configuration
├── backend-b/             # Backend B source and non-secret configuration
├── nginx/                 # nginx configuration
├── dns/                   # dnsmasq configuration and DNS notes
├── certificates/          # Public certificates only; never private keys
├── evidence/
│   ├── dns/               # DNS packet-capture evidence
│   ├── tcp/               # TCP handshake evidence
│   ├── tls/               # TLS handshake/encrypted-data evidence
│   ├── caching/           # Cache MISS/HIT/EXPIRED evidence
│   └── failures/          # Controlled failure-test evidence
├── docs/                  # Supporting documentation
├── .gitignore
└── README.md
```

Empty directories are not tracked by Git until they contain a file. Evidence and configuration artifacts should be added only after they have been genuinely produced and reviewed for sensitive information.

## 6. Private DNS

The primary DNS service runs with `dnsmasq` on Shitanshu's laptop at `10.7.22.96`. It is responsible for resolving `app.team1.test` and `api.team1.test` inside the LAN to the nginx edge server at `10.7.15.28`.

Before testing the web service, confirm that each participating client is using the intended DNS server and that both names resolve to the edge IP. DNS changes must be performed manually on the relevant machines; this repository does not alter system DNS settings.

## 7. Backend A and Backend B

Backend A runs on Shivam's laptop at `10.7.9.199:3001`. Backend B runs on Yash's laptop at `10.7.1.235:3002`.

Both backends use Node.js's built-in `http` module and require no npm packages. Backend A listens on `0.0.0.0:3001`, and Backend B listens on `0.0.0.0:3002`. Each serves `/` and `/api/status`, returns JSON, identifies itself through its response body and `X-Backend` header, and returns JSON with HTTP status `404` for other paths. The backends also emit `Cache-Control: max-age=60`; nginx applies its own cache policy to the HTTPS `/api/status` route described below.

## 8. nginx Reverse Proxy and Load Balancing

nginx runs on Keshav's laptop at `10.7.15.28`. It accepts `app.team1.test` and `api.team1.test` traffic on HTTP port `8080` and HTTPS port `8443`, forwards requests to the `cn_backends` upstream, and distributes requests between `10.7.9.199:3001` and `10.7.1.235:3002` using nginx's default round-robin behavior. Each upstream is configured with `max_fails=1` and `fail_timeout=10s`. nginx forwards the original host, client address, forwarding chain, and request scheme through proxy headers.

The reviewed nginx configuration belongs in `nginx/`. Verification should show requests being served by both Backend A and Backend B without presenting fabricated output in this document.

## 9. TLS/HTTPS

HTTPS terminates at nginx on port `8443`, with TLS 1.2 and TLS 1.3 enabled. The checked-in nginx configuration contains placeholder filesystem paths for the certificate and private key; Keshav must replace them locally with the real paths before starting nginx. The service certificate is issued by a local certificate authority and must cover the private service name or names used by clients. Once the public local CA certificate is trusted on a client, normal certificate verification should succeed without bypassing verification.

Only public certificates may be stored in `certificates/`. Private keys—including `team1-ca.key` and `app.team1.test.key`—must remain outside Git and must never be copied into this repository, printed in logs, shared as evidence, or committed.

## 10. Caching

nginx caching is configured only for the exact HTTPS route `/api/status`; the general HTTP and HTTPS locations are proxied without nginx caching. The cache uses `/tmp/team1-nginx-cache`, the shared zone `team1_cache`, a five-minute inactive timeout, and a ten-second validity period for successful responses. For this route, nginx ignores upstream `Cache-Control`, `Expires`, and `Set-Cookie` headers, emits `Cache-Control: public, max-age=10`, and exposes the result in `X-Cache-Status`.

The experiment should demonstrate and capture the progression of cache states:

- `MISS`: no valid cached response was available.
- `HIT`: nginx served a valid cached response.
- `EXPIRED`: a cached response had expired and required revalidation or refresh.

Store genuine, sanitized caching evidence in `evidence/caching/`. Record the request sequence and timing necessary to reproduce each state.

## 11. Wireshark Observations

Packet captures should be collected during real tests and saved or documented under the appropriate evidence directory. Expected observations to investigate include:

- DNS queries and responses for `app.team1.test` and `api.team1.test`.
- The TCP three-way handshake: SYN, SYN-ACK, and ACK.
- TLS ClientHello and ServerHello messages.
- Encrypted TLS application data after the handshake.

Captures must be reviewed before submission so that they do not expose credentials, private keys, session secrets, or unrelated personal traffic.

## 12. Failure Testing

Controlled tests should document how the system behaves when a component becomes unavailable. Useful scenarios include stopping one backend, stopping both backends, making the DNS service unavailable, or testing a client that does not trust the local CA.

Record only tests that were actually performed. Place sanitized evidence in `evidence/failures/`, including the test condition, expected behavior, observed behavior, and recovery step. Restore each component after its test.

## 13. How to Run

1. Connect all four laptops to the same LAN and confirm the documented IP addresses are current.
2. On Shivam's laptop, copy or clone the project, open the `backend-a` directory, and start Backend A:

   ```bash
   cd backend-a
   node server.js
   ```

   The code listens on `0.0.0.0:3001`.

3. On Yash's laptop, copy or clone the project, open the `backend-b` directory, and start Backend B:

   ```bash
   cd backend-b
   node server.js
   ```

   The code listens on `0.0.0.0:3002`.

4. On Shitanshu's laptop, review `dns/dnsmasq.conf` and use the locally appropriate dnsmasq startup procedure. The supplied configuration listens on `127.0.0.1` and `10.7.22.96` at port `53`, maps both private domains to `10.7.15.28`, forwards other queries to `8.8.8.8` and `1.1.1.1`, and enables query logging.
5. Ensure participating clients are configured to use `10.7.22.96` as their DNS server.
6. Install and trust only the public local CA certificate on test clients.
7. On Keshav's laptop, replace the certificate placeholders in `nginx/cn-project.conf` with local paths outside the repository, review the configuration, and use the locally appropriate nginx startup procedure.
8. Verify DNS, HTTP, HTTPS, load balancing, caching, and controlled failure behavior using the commands below and Wireshark captures.

Do not treat these steps as authorization for automated changes to any laptop's DNS, nginx, certificate trust, network configuration, or running services.

## 14. Verification Commands

Run verification commands from an appropriately configured LAN client. These commands are examples; capture and report only real results.

```bash
# Confirm private DNS resolution through the primary DNS server.
dig @10.7.22.96 app.team1.test
dig @10.7.22.96 api.team1.test

# Verify the HTTP edge endpoint.
curl -i http://app.team1.test:8080/

# Verify trusted HTTPS with normal certificate verification.
curl -i https://app.team1.test:8443/

# Repeat uncached HTTP requests to observe backend selection.
curl -i http://app.team1.test:8080/
curl -i http://app.team1.test:8080/

# Repeat the exact cache-enabled HTTPS route to observe cache headers.
curl -i https://app.team1.test:8443/api/status
curl -i https://app.team1.test:8443/api/status
```

## 15. Security Notes

- Never commit, copy, expose, or print private keys, passwords, credentials, environment secrets, or other sensitive material.
- `team1-ca.key` and `app.team1.test.key` must never be committed under any circumstances.
- The `.gitignore` excludes common private-key, certificate-bundle, environment, dependency, and macOS metadata files; it is a safeguard, not a substitute for reviewing staged changes.
- Keep CA and server private keys outside the repository with restrictive filesystem permissions.
- Commit only public certificate material that is genuinely required for the submission and approved for distribution.
- Review `git status` and the staged diff before every commit.
- Sanitize screenshots, packet captures, and logs before adding them to `evidence/`.
- Never bypass TLS certificate verification in the trusted-CA demonstration.
- Use this project only on the authorized private LAN and only against participating systems.
