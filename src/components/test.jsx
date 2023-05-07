import { useEffect } from "react"
import { Symbl } from "@symblai/symbl-web-sdk";
import { useHMSActions } from "@100mslive/react-sdk";
export default function Test()
{
    const hmsActions = useHMSActions();
    
    const startVoiceRecognition = async () =>{
        const symbl = new Symbl(({
          appId: '7076376850305a49734967465a30626b6c665439666c33496545485a70555439',
          appSecret: '466351705a51472d737170556133745673305149656f534d492d7151774259414b4367697a324e636936446d4d483967684b4641776c4b6b646133345452776d',
        }))
        const connection = await symbl.createConnection();
        
        // Start processing audio from your default input device.
        await connection.startProcessing({
          insightTypes: ["question", "action_item", "follow_up"],
          config: {
            encoding: "OPUS", // Encoding can be "LINEAR16" or "OPUS"
         
          },
          speaker: {
            userId: "user@example.com",
            name: "Your Name Here"
          }
        });
        connection.on("speech_recognition", (speechData) => {
          const { punctuated } = speechData;
          const name = speechData.user ? speechData.user.name : "User";
          hmsActions.sendBroadcastMessage(punctuated.transcript)
          console.log(`${name}: `, punctuated.transcript);
        });
      }

     
    startVoiceRecognition()
    
    console.log('ok')
    return(    <div>Hello</div>)

}

