# OLT Brands - Protocols & Ports Documentation

This document details the connection protocols and ports for each supported OLT brand.

## 📡 Protocol Summary

| Brand      | Primary    | Fallback   | Default Port | Web UI Port | CLI Port |
|------------|------------|------------|--------------|-------------|----------|
| ZTE        | SSH        | Telnet     | 22           | 8080        | 22/23    |
| Huawei     | SSH        | Telnet     | 22           | N/A         | 22/23    |
| VSOL       | HTTP API   | Telnet     | 8085         | 80/8080/8085| 23       |
| BDCOM      | Telnet     | SSH        | 23           | 80          | 23/22    |
| DBC        | HTTP API   | Telnet     | 80           | 80/8080     | 23       |
| CDATA      | HTTP API   | Telnet     | 80           | 80/8080     | 23       |
| ECOM       | HTTP API   | Telnet     | 80           | 80/8080     | 23       |
| Fiberhome  | Telnet     | SSH        | 23           | N/A         | 23/22    |
| Nokia      | SSH        | SNMP       | 22           | N/A         | 22       |

---

## 🔧 Detailed Brand Configuration

### ZTE (C320, C300, C220)
- **Primary Protocol**: SSH (port 22)
- **Fallback Protocol**: Telnet (port 23)
- **SNMP Port**: 161 (read-only monitoring)
- **Default Credentials**: zte/zte
- **CLI Commands**:
  ```
  terminal length 0
  show gpon onu state
  show gpon onu detail-info
  show gpon onu optical-info
  ```

### Huawei (MA5680T, MA5608T, MA5683T)
- **Primary Protocol**: SSH (port 22)
- **Fallback Protocol**: Telnet (port 23)
- **Default Credentials**: root/admin123
- **CLI Commands**:
  ```
  screen-length 0 temporary
  display ont info summary all
  display ont optical-info all
  ```

### VSOL (V1600D, V1600G, V2804G)
- **Primary Protocol**: HTTP API (port 8085, 8080, or 80)
- **Fallback Protocol**: Telnet (port 23)
- **Web UI Ports**: 80, 8080, 8085, 443
- **Default Credentials**: admin/admin or admin/1234
- **API Endpoints**:
  ```
  /cgi-bin/onu_status.cgi
  /api/onu/status
  /goform/getOnuList
  ```
- **Telnet CLI Commands**:
  ```
  terminal length 0
  show onu status all
  show onu optical-info all
  show onu info all
  show onu opm-diag all
  ```

### BDCOM (P3310, P3608)
- **Primary Protocol**: Telnet (port 23)
- **Fallback Protocol**: SSH (port 22)
- **EPON Mode**: Yes
- **Default Credentials**: admin/admin
- **CLI Commands**:
  ```
  terminal length 0
  show epon onu-info
  show epon optical-transceiver-diagnosis interface
  ```

### DBC
- **Primary Protocol**: HTTP API (port 80/8080)
- **Fallback Protocol**: Telnet (port 23)
- **Default Credentials**: admin/admin
- **CLI Commands**:
  ```
  terminal length 0
  show onu status
  show onu optical-power
  show onu list
  ```

### CDATA (FD1104B, FD1204)
- **Primary Protocol**: HTTP API (port 80/8080)
- **Fallback Protocol**: Telnet (port 23)
- **Default Credentials**: admin/admin
- **CLI Commands**:
  ```
  terminal length 0
  show onu status all
  show onu optical-info all
  show onu list
  ```

### ECOM
- **Primary Protocol**: HTTP API (port 80/8080)
- **Fallback Protocol**: Telnet (port 23)
- **CLI Commands**:
  ```
  terminal length 0
  show gpon onu state
  show gpon onu optical
  show gpon onu info
  ```

### Fiberhome (AN5516)
- **Primary Protocol**: Telnet (port 23)
- **Fallback Protocol**: SSH (port 22)
- **CLI Commands**:
  ```
  show gpon onu state
  show gpon onu list
  ```

### Nokia (7360)
- **Primary Protocol**: SSH (port 22)
- **SNMP Port**: 161
- **CLI Commands**:
  ```
  environment no more
  show equipment ont status
  show equipment ont optics
  ```

---

## 🔌 Port Usage Guide

### When Adding an OLT, Use These Ports:

| Scenario | Recommended Port |
|----------|------------------|
| SSH connection (ZTE, Huawei, Nokia) | 22 |
| Telnet connection (older OLTs) | 23 |
| Web API (VSOL newer models) | 8085 or 80 |
| Web API (DBC, CDATA, ECOM) | 80 or 8080 |
| SNMP monitoring only | 161 |
| MikroTik API | 8728 |

### Special Notes:
- **VSOL Port 8085**: Most VSOL GPON OLTs use port 8085 for web interface
- **If HTTP fails**: System automatically falls back to Telnet on port 23
- **SNMP**: Read-only, only shows basic status (online/offline)
- **Custom ports**: Some ISPs change default ports for security

---

## 🛠️ Troubleshooting

### Connection Refused Error
1. Check if the correct port is being used
2. Verify OLT is reachable (ping test)
3. Check firewall settings on OLT
4. Try alternative port (e.g., Telnet on 23 instead of HTTP on 8085)

### Authentication Failed
1. Verify username/password
2. Check if user has CLI access permissions
3. Some OLTs require enable password

### Timeout Error
1. Increase SSH_TIMEOUT_MS in .env (default: 60000)
2. Check network latency to OLT
3. OLT may be overloaded - try again later

### No Data Returned
1. Verify CLI commands are correct for OLT model
2. Check if ONUs are registered
3. Try different polling method (HTTP vs Telnet)
