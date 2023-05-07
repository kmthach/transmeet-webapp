import React, { Suspense, useEffect } from "react";
import { useQuery } from "react-query";
import {
  selectIsConnectedToRoom,
  selectLocalPeerRoleName,
  selectPeerScreenSharing,
  selectPeerSharingAudio,
  selectPeerSharingVideoPlaylist,
  selectTemplateAppData,
  useHMSActions,
  useHMSStore,
} from "@100mslive/react-sdk";
import { Flex } from "@100mslive/react-ui";
import FullPageProgress from "../components/FullPageProgress";
import EmbedView from "./EmbedView";
import { InsetView } from "./InsetView";
import { MainGridView } from "./mainGridView";
import ScreenShareView from "./screenShareView";
import SidePane from "./SidePane";
import { WaitingView } from "./WaitingView";
import { useWhiteboardMetadata } from "../plugins/whiteboard";
import { useAppConfig } from "../components/AppData/useAppConfig";
import {
  useHLSViewerRole,
  useIsHeadless,
  usePinnedTrack,
  useUISettings,
  useUrlToEmbed,
  useWaitingViewerRole,
} from "../components/AppData/useUISettings";
import { UI_MODE_ACTIVE_SPEAKER } from "../common/constants";
import {Symbl} from '@symblai/symbl-web-sdk'
import { useEffectOnce } from "react-use";

const WhiteboardView = React.lazy(() => import("./WhiteboardView"));
const HLSView = React.lazy(() => import("./HLSView"));
const ActiveSpeakerView = React.lazy(() => import("./ActiveSpeakerView"));
const PinnedTrackView = React.lazy(() => import("./PinnedTrackView"));

export const ConferenceMainView = () => {
  const localPeerRole = useHMSStore(selectLocalPeerRoleName);
  const pinnedTrack = usePinnedTrack();
  const peerSharing = useHMSStore(selectPeerScreenSharing);
  const peerSharingAudio = useHMSStore(selectPeerSharingAudio);
  const peerSharingPlaylist = useHMSStore(selectPeerSharingVideoPlaylist);
  const { whiteboardOwner: whiteboardShared } = useWhiteboardMetadata();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const uiMode = useHMSStore(selectTemplateAppData).uiMode;
  const hmsActions = useHMSActions();
  const isHeadless = useIsHeadless();
  const headlessUIMode = useAppConfig("headlessConfig", "uiMode");
  const { uiViewMode, isAudioOnly } = useUISettings();
  const hlsViewerRole = useHLSViewerRole();
  const waitingViewerRole = useWaitingViewerRole();
  const urlToIframe = useUrlToEmbed();
  
  
  useEffect(() => {
    
    if (!isConnected) {
      return;
    }
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
      let oldTime 
      let oldMsg
      connection.on("speech_recognition", (speechData) => {
        const { punctuated } = speechData;
        const name = speechData.user ? speechData.user.name : "User";
        if (Date.now() - oldTime > 2000 && oldTime ){
          hmsActions.sendBroadcastMessage(oldMsg)
          oldTime = undefined
        }
        else {
          oldTime = Date.now()
          
        }
        oldMsg = punctuated.transcript
        console.log(`${name}: `, punctuated.transcript);
      });
      setInterval(() => {
        if (oldTime && oldMsg && Date.now() - oldTime > 2000){
          hmsActions.sendBroadcastMessage(oldMsg)
          oldTime = undefined
        }
      })
    }
  startVoiceRecognition()

    
    const audioPlaylist = JSON.parse(
      process.env.REACT_APP_AUDIO_PLAYLIST || "[]"
    );
    const videoPlaylist = JSON.parse(
      process.env.REACT_APP_VIDEO_PLAYLIST || "[]"
    );
    if (videoPlaylist.length > 0) {
      hmsActions.videoPlaylist.setList(videoPlaylist);
    }
    if (audioPlaylist.length > 0) {
      hmsActions.audioPlaylist.setList(audioPlaylist);
    }

    hmsActions.sessionStore.observe(["pinnedMessage", "spotlight"]);
  }, [isConnected, hmsActions]);

  if (!localPeerRole) {
    // we don't know the role yet to decide how to render UI
    return null;
  }

  let ViewComponent;
  if (localPeerRole === hlsViewerRole) {
    ViewComponent = HLSView;
  } else if (localPeerRole === waitingViewerRole) {
    ViewComponent = WaitingView;
  } else if (urlToIframe) {
    ViewComponent = EmbedView;
  } else if (whiteboardShared) {
    ViewComponent = WhiteboardView;
  } else if (uiMode === "inset") {
    ViewComponent = InsetView;
  } else if (
    ((peerSharing && peerSharing.id !== peerSharingAudio?.id) ||
      peerSharingPlaylist) &&
    !isAudioOnly
  ) {
    ViewComponent = ScreenShareView;
  } else if (pinnedTrack) {
    ViewComponent = PinnedTrackView;
  } else if (
    uiViewMode === UI_MODE_ACTIVE_SPEAKER ||
    (isHeadless && headlessUIMode === UI_MODE_ACTIVE_SPEAKER)
  ) {
    ViewComponent = ActiveSpeakerView;
  } else {
    ViewComponent = MainGridView;
  }

  return (
    <Suspense fallback={<FullPageProgress />}>
      <Flex
        css={{
          size: "100%",
          position: "relative",
        }}
      >
        <ViewComponent />
        <SidePane />
      </Flex>
    </Suspense>
  );
};
