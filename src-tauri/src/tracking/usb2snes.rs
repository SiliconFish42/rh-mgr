use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};

use tokio::net::TcpStream;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};
use tokio_tungstenite::tungstenite::Message;

#[derive(Debug)]
pub struct Usb2SnesClient {
    stream: WebSocketStream<MaybeTlsStream<TcpStream>>,
    pub device_name: Option<String>,
    pub flags: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Command {
    #[serde(rename = "Opcode")]
    opcode: String,
    #[serde(rename = "Space")]
    space: String,
    #[serde(rename = "Operands", skip_serializing_if = "Option::is_none")]
    operands: Option<Vec<String>>,
}

#[derive(Deserialize, Debug)]
struct DeviceListResponse {
    #[serde(rename = "Results")]
    results: Vec<String>,
}

impl Usb2SnesClient {
    pub async fn connect(url: &str) -> Result<Self, String> {
        let (stream, _) = connect_async(url)
            .await
            .map_err(|e| format!("WebSocket connection failed: {}", e))?;

        Ok(Self {
            stream,
            device_name: None,
            flags: Vec::new(),
        })
    }

    pub async fn list_devices(&mut self) -> Result<Vec<String>, String> {
        let cmd = Command {
            opcode: "DeviceList".to_string(),
            space: "SNES".to_string(),
            operands: None,
        };

        let json = serde_json::to_string(&cmd).map_err(|e| e.to_string())?;
        self.send_text(json).await?;

        // Wait for response
        if let Some(msg) = self.stream.next().await {
            let msg = msg.map_err(|e| e.to_string())?;
            if let Message::Text(text) = msg {
                let response: DeviceListResponse = serde_json::from_str(&text)
                    .map_err(|e| format!("Failed to parse device list: {}", e))?;
                return Ok(response.results);
            }
        }

        Err("No response received for DeviceList".to_string())
    }

    pub async fn attach(&mut self, device: &str) -> Result<(), String> {
        let cmd = Command {
            opcode: "Attach".to_string(),
            space: "SNES".to_string(),
            operands: Some(vec![device.to_string()]),
        };

        let json = serde_json::to_string(&cmd).map_err(|e| e.to_string())?;
        self.send_text(json).await?;

        self.device_name = Some(device.to_string());
        Ok(())
    }

    pub async fn register_app(&mut self, app_name: &str) -> Result<(), String> {
        let cmd = Command {
            opcode: "Name".to_string(),
            space: "SNES".to_string(),
            operands: Some(vec![app_name.to_string()]),
        };

        let json = serde_json::to_string(&cmd).map_err(|e| e.to_string())?;
        self.send_text(json).await?;
        Ok(())
    }

    pub async fn info(&mut self) -> Result<Vec<String>, String> {
        let cmd = Command {
            opcode: "Info".to_string(),
            space: "SNES".to_string(),
            operands: None,
        };

        let json = serde_json::to_string(&cmd).map_err(|e| e.to_string())?;
        self.send_text(json).await?;

        // Wait for response
        if let Some(msg) = self.stream.next().await {
            let msg = msg.map_err(|e| e.to_string())?;
            if let Message::Text(text) = msg {
                let response: DeviceListResponse = serde_json::from_str(&text)
                    .map_err(|e| format!("Failed to parse info: {}", e))?;
                // Store flags (indices 3 onwards usually, but let's just store all results)
                if response.results.len() > 3 {
                    self.flags = response.results[3..].to_vec();
                }
                return Ok(response.results);
            }
        }
        Err("No response received for Info".to_string())
    }

    async fn send_text(&mut self, text: String) -> Result<(), String> {
        // eprintln!("DEBUG: Sending: {}", text);
        self.stream
            .send(Message::Text(text.into()))
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn read_memory(&mut self, address: u32, size: u32) -> Result<Vec<u8>, String> {
        let cmd = Command {
            opcode: "GetAddress".to_string(),
            space: "SNES".to_string(),
            operands: Some(vec![
                format!("{:06X}", address),
                format!("{:X}", size),
            ]),
        };

        let json = serde_json::to_string(&cmd).map_err(|e| e.to_string())?;
        self.send_text(json).await?;

        while let Some(msg) = self.stream.next().await {
            let msg = msg.map_err(|e| e.to_string())?;
            match msg {
                Message::Binary(data) => {
                    if data.len() as u32 != size {
                        return Ok(data.to_vec());
                    }
                    return Ok(data.to_vec());
                }
                Message::Text(_text) => {
                    // eprintln!("DEBUG: Received Text in read_memory: {}", text);
                    // Could be an error or info?
                }
                _ => {}
            }
        }

        Err("No binary data received".to_string())
    }
}
