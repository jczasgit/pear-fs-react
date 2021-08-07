// todo: Refactor code ♻
// note: When refactoring code, improve wrtc instance clean up
// note: which includes removing event listeners.

// todo: Implement switch room feature.
import { FC, Fragment, useEffect, useRef, useState } from "react";
import { TopNav, TopNavItem, TopNavItemContainer } from "./TopNav";
import "./Room.css";
import { Avatar } from "./Avatar";
import { RouteComponentProps } from "react-router-dom";
import { Header } from "./Header";
import Modal from "./Modal";
import { Socket } from "socket.io-client";
import { useSocket } from "../hooks/useSocket";
import { Metadata, WRTC } from "../helpers/wrtc";
import queueMicrotask from "queue-microtask";
import { FileCard } from "./FileCard";
import { useNotification } from "../hooks/useNotification";
import { nanoid } from "nanoid";
import { Loading } from "./Loading";

declare interface Props extends RouteComponentProps<{ id: string }> {
  setTheme: Function;
}

const Room: FC<Props> = ({ setTheme, match }) => {
  const [toggleThemeIcon, setToggleThemeIcon] = useState(false);
  const [roomId, setRoomId] = useState(match.params.id);
  const [switchModal, setSwitchModal] = useState(false);
  const [peers, setPeers] = useState([]);
  const [fileConfirm, setFileConfirm] = useState(false);
  const [incomingFileModal, setIncomingFileModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<Socket>(useSocket());
  const notification = useNotification();
  const switchRoomInputRef = useRef<HTMLInputElement>();
  const downloadTrafficRef = useRef<SVGPathElement>();
  const uploadTrafficRef = useRef<SVGPathElement>();
  const incomingFilesRef = useRef<Array<{ id: string; metadata: Metadata }>>(
    []
  );
  const currentIncomingFileRef =
    useRef<{ id: string; metadata: Metadata }>(null);

  /**
   * WRTC object has properties:
   * * peerConnection: RTCPeerConnection - this is null until "you" decide to connect to a peer or receive an offer.
   * * dataChannel: RTCDataChannel - main data channel.
   * WRTC object has methods:
   * * sendBinary(data: ArrayBuffer, id?: number) - send binary data through dataChannel. Negotiation is needed before sending any binary data.
   * * sendJson(json: any) - send binary data through dataChannel. Negotiation is needed before sending any binary data.
   * * connect(desc: RTCSessionDescription) - connect to peer. If "you" are connecting to peer, then pass true, otherwise leave blank.
   * * connect(initiator: boolean, opts?: { description: RTCSessionDescription }) - connect to peer. If "you" are connecting to peer, then pass true, otherwise leave blank.
   * * connect(initOrDesc: boolean | RTCSessionDescription) - connect to peer. If "you" are connecting to peer, then pass true, otherwise leave blank.
   * * disconnect() - disconnect from peer.
   * WRTC object events:
   * * signal - ready to signal ICE to peer.
   * * data - receiving binary data
   * * progress - indicates the progress of file transfer [0-1] range.
   * * close - emitted when wrtc data channel is closed.
   * * closing - emitted when wrtc data channel is closing. (only available in some browsers)
   * * error - emitted when wrtc catches an error.
   * * answer - emitted when a signal is received and an answer is created.
   * * connectionstatechange - emitted when the wrtc connection state changes.
   * * iceconnectionstatechange - emitted when wrtc ice connection state changes.
   * * icegathetingerror - emitted when there is an error gathering ice candidates.
   * * incoming - emitted when a peer wants to share a file.
   * * open - emitted when the wrtc data channel is opened and ready to send/receive data.
   */
  const wrtcPool = useRef<Map<string, WRTC>>(new Map());
  const [confirmationInfo, setConfirmatioInfo] =
    useState<{ id: string; file: File }>(null);

  useEffect(() => {
    if (socketRef.current.disconnected) {
      socketRef.current.connect();
      let timeoutId = setTimeout(() => {
        timeoutId = null;
        notification({
          type: "ADD_NOTIFICATION",
          payload: {
            id: nanoid(),
            lifeSpan: 5000,
            message:
              "Could not reach signaling server. Please try again later.",
            title: "Signal Server Error",
            type: "error",
          },
        });
      }, 10000);
      socketRef.current.emit("greetings");
      socketRef.current.once("greetings", (id) => {
        clearTimeout(timeoutId);
        timeoutId = null;
        setLoading(false);
        // console.log("greetings from server");
        if (socketRef.current.id !== id) socketRef.current.id = id;

        socketRef.current.emit("join-room", roomId);
        socketRef.current.once("room-joined", ({ joined, roomId, peers }) => {
          if (joined) {
            // console.log("Join room: " + roomId);
            socketRef.current
              .off("new-peer", onNewPeer)
              .on("new-peer", onNewPeer);
            socketRef.current
              .off("peer-exit", onPeerExit)
              .on("peer-exit", onPeerExit);
            socketRef.current
              .off("new-nickname", onNewNickname)
              .on("new-nickname", onNewNickname);
            socketRef.current.off("signal", onSignal).on("signal", onSignal);
            socketRef.current.off("ping-peer", onPing).on("ping-peer", onPing);

            setPeers((_peers) => {
              for (let p of peers) {
                let wrtc = new WRTC(socketRef.current.id, p.peerId);
                wrtc.on("incoming", onIncomingFile.bind(wrtc, wrtc.peerid));
                wrtc.on("error", (err) => {
                  notification({
                    type: "ADD_NOTIFICATION",
                    payload: {
                      id: nanoid(),
                      lifeSpan: 5000,
                      message:
                        "An error occurred during peer to peer connection.",
                      title: "WebRTC Error",
                      type: "error",
                    },
                  });
                  console.error(err);
                });
                wrtcPool.current.set(p.peerId, wrtc);
              }

              return peers;
            });
          } else {
            notification({
              type: "ADD_NOTIFICATION",
              payload: {
                id: nanoid(),
                lifeSpan: 5000,
                message: "Could not join room.",
                title: "Error",
                type: "error",
              },
            });
            // todo: route to error page
          }
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, wrtcPool]);

  const onSignal = (signal: string, from: string) => {
    // note: conncetion offer from a peer
    if (!wrtcPool.current.has(from)) {
      console.warn("Received signal from unknown peer: " + from);
      console.warn("Received signal: " + signal);
      return;
    }

    let wrtc = wrtcPool.current.get(from);

    wrtc.once("signal", (answer) => {
      socketRef.current.emit("answer", answer);
      // window["dc"] = wrtcPool.current.get(from);
    });

    wrtc.once("close", () => {
      console.log("data channel closed.");
      // todo: maintain connection after the file has been saved and destroyed.
      wrtc.close();
      downloadTrafficRef.current.classList.remove("active");
      uploadTrafficRef.current.classList.remove("active");
    });

    wrtc.once("done", (filename: string) => {
      notification({
        type: "ADD_NOTIFICATION",
        payload: {
          id: nanoid(),
          lifeSpan: 5000,
          message: `File: ${filename}\nstarted downloading from peer.`,
          title: "File Download",
          type: "success",
        },
      });
    });

    wrtc.connect(new RTCSessionDescription(JSON.parse(signal)));
  };

  const onPing = (id: string) => {
    socketRef.current.emit("pong-peer", id);
  };

  const onNewPeer = (peer: {
    peerId: string;
    avatarId: string;
    nickname: string;
  }) => {
    // console.log("new peer", peer);
    let wrtc = new WRTC(socketRef.current.id, peer.peerId);
    wrtc.on("incoming", onIncomingFile.bind(wrtc, wrtc.peerid));
    wrtc.on("error", (err) => {
      notification({
        type: "ADD_NOTIFICATION",
        payload: {
          id: nanoid(),
          lifeSpan: 5000,
          message: "An error occurred during peer to peer connection.",
          title: "WebRTC Error",
          type: "error",
        },
      });
      console.error(err);
    });
    wrtcPool.current.set(peer.peerId, wrtc);
    setPeers((peers) => [...peers, peer]);
  };

  const onPeerExit = (peerId: string) => {
    // do something
    console.log("peer exit", peerId);
    wrtcPool.current.delete(peerId);
    setPeers((peers) => peers.filter((p) => p.peerId !== peerId));
  };

  const toggleTheme = () => {
    setTheme();
    setToggleThemeIcon((t) => !t);
  };

  const onNewNickname = ({
    nickname,
    peerId,
  }: {
    nickname: string;
    peerId: string;
  }) => {
    setPeers((peers) =>
      peers.map((p) => {
        if (p.peerId === peerId) {
          return {
            peerId: p.peerId,
            avatarId: p.avatarId,
            nickname, // register new nickname
            progress: p.progess,
            activeProgess: p.activeProgess,
          };
        }

        return p;
      })
    );
  };

  const onNicknameChange = (nickname: string) => {
    if (socketRef.current.connected) {
      socketRef.current.emit("new-nickname", nickname);
    }
  };

  const onIncomingFile = (id: string, metadata: Metadata) => {
    if (currentIncomingFileRef.current !== null) {
      incomingFilesRef.current.push({ id, metadata });
      return;
    } else {
      currentIncomingFileRef.current = { id, metadata };
      // console.log(currentIncomingFileRef.current);
      setIncomingFileModal(true);
    }
  };

  const onAcceptFile = () => {
    closeIncomingFileModal(null, false);

    let wrtc = wrtcPool.current.get(currentIncomingFileRef.current.id);
    wrtc.acceptFile(currentIncomingFileRef.current.metadata);
    let lastRecorded = 0;
    wrtc.on("progress", (progress) => {
      if (lastRecorded === 0) {
        notification({
          type: "ADD_NOTIFICATION",
          payload: {
            id: nanoid(),
            lifeSpan: 5000,
            message: `File downloading...`,
            title: "File Download",
            type: "info",
          },
        });
      }

      let currentTime = new Date().getTime();
      let elapsedTime = currentTime - lastRecorded;
      if (progress >= 1) {
        downloadTrafficRef.current.classList.remove("active");
        lastRecorded = null;
        elapsedTime = null;
        currentTime = null;
      } else if (elapsedTime > 500) {
        downloadTrafficRef.current.classList.toggle("active");
        lastRecorded = currentTime;
      }
    });

    checkIncomingFilesQueue();
  };

  const checkIncomingFilesQueue = async () => {
    if (incomingFilesRef.current.length > 0) {
      currentIncomingFileRef.current = incomingFilesRef.current.shift();
      queueMicrotask(() => {
        setIncomingFileModal(true);
      });
    }
  };

  const closeIncomingFileModal = (_: any, closeAsReject: boolean = true) => {
    setIncomingFileModal(false);

    // check if there are more incoming files
    if (currentIncomingFileRef.current !== null && closeAsReject) {
      wrtcPool.current
        .get(currentIncomingFileRef.current.id)
        .rejectFile(currentIncomingFileRef.current.metadata);
      checkIncomingFilesQueue();
    }
  };

  const toggleSwitchModal = () => {
    setSwitchModal((b) => !b);
  };

  const switchRoom = () => {
    toggleSwitchModal(); // close the modal
    let roomToSwitch = switchRoomInputRef.current.value;
    if (roomToSwitch && /^[A-Za-z0-9]{8}$/.test(roomToSwitch)) {
      // setRoomId(roomToSwitch);
      socketRef.current.emit("switch-room", roomToSwitch);
      socketRef.current.once("room-switched", ({ joined, roomId, peers }) => {
        // joined is empty string if not joined successfully.
        if (joined) {
          console.log("switched to " + roomId);
          setRoomId(roomId);
          setPeers(peers);
        } else {
          // todo: Route to error page ❌
          // note: instead of an error page,
          // note: allow user to copy and paste 📝
          // note: ice candidate and manually connect
          notification({
            type: "ADD_NOTIFICATION",
            payload: {
              id: nanoid(),
              lifeSpan: 5000,
              message: "Could not join room.",
              title: "Error",
              type: "error",
            },
          });
        }
      });
    } else {
      notification({
        type: "ADD_NOTIFICATION",
        payload: {
          id: nanoid(),
          lifeSpan: 5000,
          message:
            "Invalid room id. Only Alphanumeric characters are allowed and with length of 8 characters.",
          title: "Error",
          type: "error",
        },
      });
    }
  };

  // the peerId so we know how to manage and send the file
  // to the correct peer.
  const manageSelectedFile = (peerId: string, input: HTMLInputElement) => {
    setConfirmatioInfo({
      id: peerId,
      file: input.files[0],
    });
    toggleFileModal();
  };

  const toggleFileModal = () => {
    if (fileConfirm && confirmationInfo !== null) {
      // cancel / exit from file confirmation modal
      // without confirming file submition
      // clear the currentFileConfirmationRef
      setConfirmatioInfo(null);
    }

    setFileConfirm((b) => !b);
  };

  const onFileConfirmed = () => {
    // note: sending file to

    // notify the use that we are waiting for peer to accept file
    notification({
      type: "ADD_NOTIFICATION",
      payload: {
        id: nanoid(),
        lifeSpan: 5000,
        message: "Waiting for peer to accept file.",
        title: "Info",
        type: "info",
      },
    });

    // start file share
    // 1. negotiate file share with peer
    // check if we actually have a current file confirmation
    if (confirmationInfo !== null) {
      let wrtc = wrtcPool.current.get(confirmationInfo.id);

      wrtc.once("signal", (signal) => {
        // console.log(signal);

        // console.log("Ping peer " + confirmationInfo.id);
        socketRef.current.emit("ping-peer", confirmationInfo.id);

        let timeout = setTimeout(() => {
          console.error("Timeout, could not reach peer " + confirmationInfo.id);
        }, 10000);

        socketRef.current.once("pong-peer", (id) => {
          clearTimeout(timeout);
          console.log("Pong from peer " + id);

          socketRef.current.emit("signal", signal);
          socketRef.current.once("answer", (answer) => {
            wrtc
              .setAnswer(new RTCSessionDescription(JSON.parse(answer)))
              .then(() => console.log("Answer set as remote description."))
              .catch(console.error)
              .finally(() => {
                wrtc.on("open", () => {
                  console.log("data channel opened.");

                  wrtc.setFile(confirmationInfo.file).then(() => {
                    wrtc.sendJson({
                      type: "file",
                      payload: {
                        pieces: wrtc.file.pieces,
                        pieceLength: wrtc.file.pieceLength,
                        filename: wrtc.file.name,
                        type: wrtc.file.type,
                        size: wrtc.file.size,
                      },
                    });

                    let lastRecorded = 0;
                    wrtc.on("progress", (progress) => {
                      if (lastRecorded === 0) {
                        notification({
                          type: "ADD_NOTIFICATION",
                          payload: {
                            id: nanoid(),
                            lifeSpan: 5000,
                            message: "File share started.",
                            title: "File Share",
                            type: "info",
                          },
                        });
                      }

                      let currentTime = new Date().getTime();
                      let elapsedTime = currentTime - lastRecorded;
                      if (progress >= 1) {
                        uploadTrafficRef.current.classList.remove("active");
                        lastRecorded = null;
                        elapsedTime = null;
                        currentTime = null;
                      } else if (elapsedTime > 500) {
                        uploadTrafficRef.current.classList.toggle("active");
                        lastRecorded = currentTime;
                      }
                    });

                    wrtc.once("done", (filename: string) => {
                      notification({
                        type: "ADD_NOTIFICATION",
                        payload: {
                          id: nanoid(),
                          lifeSpan: 5000,
                          message: `File: ${filename}\ndone sharing!`,
                          title: "File Done",
                          type: "success",
                        },
                      });
                    });

                    wrtc.once("reject", (filename: string) => {
                      notification({
                        type: "ADD_NOTIFICATION",
                        payload: {
                          id: nanoid(),
                          lifeSpan: 5000,
                          message: `File: ${filename}\nrejected by peer.`,
                          title: "File Rejected",
                          type: "warning",
                        },
                      });
                    });
                  });
                });

                wrtc.once("close", () => {
                  console.log("data channel closed.");
                  // todo: maintain connection after the file has been saved and destroyed.
                  wrtc.close();
                  downloadTrafficRef.current.classList.remove("active");
                  uploadTrafficRef.current.classList.remove("active");
                });
              });
          });
        });
      });

      wrtc.connect(true);
    }

    setFileConfirm(false);
  };

  const allPeers = peers.map((peer, index) => {
    if (index === 0)
      return (
        <Avatar
          key={index}
          avatarId={peer.avatarId}
          id={peer.peerId}
          disableEdit={false}
          prefix="You"
          peerId={peer.peerId}
          onNicknameChange={onNicknameChange}
        />
      );

    return (
      <Avatar
        key={index}
        avatarId={peer.avatarId}
        id={peer.peerId}
        disableEdit={true}
        customNickname={peer.nickname}
        peerId={peer.peerId}
        onFileSelected={manageSelectedFile}
      />
    );
  });

  return (
    <Fragment>
      <TopNav>
        <TopNavItemContainer>
          <TopNavItem>
            {/* Share Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                className="primary-path"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </TopNavItem>
        </TopNavItemContainer>
        <TopNavItemContainer>
          <TopNavItem>
            {/* Network Traffic Icon */}
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                ref={downloadTrafficRef}
                className="secondary-path traffic-arrow"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 17l-4 4m0 0l-4-4m4 4V3"
              />
              <path
                ref={uploadTrafficRef}
                className="primary-path traffic-arrow"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 7l4-4m0 0l4 4m-4-4v18"
              />
            </svg>
          </TopNavItem>
        </TopNavItemContainer>
        <TopNavItemContainer
          toggle={toggleThemeIcon}
          onClick={toggleTheme}
          initialIndex={
            window.localStorage.getItem("theme") &&
            window.localStorage.getItem("theme") === "dark-theme"
              ? 0
              : 1
          }
        >
          <TopNavItem for="dark-theme">
            {/* Sun Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                className="primary-path"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </TopNavItem>
          <TopNavItem for="light-theme">
            {/* Moon Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                className="primary-path"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </TopNavItem>
        </TopNavItemContainer>
        <TopNavItemContainer onClick={toggleSwitchModal} disabled={true}>
          <TopNavItem>
            {/* Key icon (swith room) */}
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className="primary-path"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </TopNavItem>
        </TopNavItemContainer>
      </TopNav>
      <Header />
      <div className="peer-field">{allPeers}</div>
      <Modal
        isOpen={switchModal}
        onClose={toggleSwitchModal}
        title="Switch Room"
        onSubmit={switchRoom}
      >
        <input
          type="text"
          name="roomId"
          maxLength={8}
          placeholder="Enter room id"
          ref={switchRoomInputRef}
        />
      </Modal>
      <Modal
        isOpen={fileConfirm}
        onClose={toggleFileModal}
        onSubmit={onFileConfirmed}
        title="File Confirmation"
      >
        {/* put file card in here */}
        <FileCard
          type="upload"
          content={confirmationInfo ? confirmationInfo.file.name : ""}
        />
      </Modal>
      <Modal
        isOpen={incomingFileModal}
        onClose={closeIncomingFileModal}
        onSubmit={onAcceptFile}
        title="Incoming File"
      >
        {/* put file card in here */}
        <FileCard
          type="download"
          content={
            currentIncomingFileRef.current !== null
              ? currentIncomingFileRef.current.metadata.filename
              : ""
          }
        />
      </Modal>
      <Loading exit={!loading} withTimeout={true} />
    </Fragment>
  );
};

export default Room;
