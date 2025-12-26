use app_lib::tracking::usb2snes::Usb2SnesClient;

#[tokio::main]
async fn main() {
    println!("Verifying Usb2SnesClient...");
    println!("Connecting to ws://127.0.0.1:23074...");

    match Usb2SnesClient::connect("ws://127.0.0.1:23074").await {
        Ok(mut client) => {

            println!("STEP 1: Connected!");
            
            println!("STEP 2: Registering App...");
            let _ = client.register_app("ROM Hack Manager").await;
            
            println!("STEP 3: Listing Devices...");
            match client.list_devices().await {
                Ok(devices) => {
                    println!("STEP 4: Devices found: {:?}", devices);
                    if let Some(first) = devices.first() {
                         println!("STEP 5: Attaching to {}", first);
                         if let Err(e) = client.attach(first).await {
                             println!("Attach failed: {}", e);
                         } else {
                             println!("STEP 6: Attached successfully.");
                             
                             println!("STEP 7: getting info...");
                             match client.info().await {
                                 Ok(info) => {
                                     println!("Device Info: {:?}", info);
                                     println!("Flags: {:?}", client.flags);
                                 }
                                 Err(e) => println!("Info failed: {}", e),
                             }

                             tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                             
                             if client.flags.iter().any(|f| f == "NO_ROM_READ") {
                                 println!("WARNING: Device reports NO_ROM_READ. Skipping ROM read test.");
                                 // Test WRAM instead
                                 println!("Testing WRAM read instead...");
                                 match client.read_memory(0xF50000, 32).await {
                                     Ok(data) => println!("WRAM Read success: {:?}", data),
                                     Err(e) => println!("WRAM Read failed: {}", e),
                                 }
                             } else {
                                 println!("STEP 8: Reading memory at 00FFC0 (32 bytes)...");
                                 match client.read_memory(0x00FFC0, 32).await {
                                     Ok(data) => {
                                         println!("STEP 9: Read {} bytes: {:?}", data.len(), data);
                                     }
                                     Err(e) => {
                                         println!("STEP 9: Read failed: {}", e);
                                     }
                                 }
                             }
                         }

                    } else {
                        println!("No devices to attach to.");
                    }
                }
                Err(e) => {
                    println!("List devices failed: {}", e);
                }
            }
        }
        Err(e) => {
            println!("Connection failed: {}", e);
            println!("Make sure QUsb2snes / SNI is running and listening on port 23074.");
        }
    }
}
