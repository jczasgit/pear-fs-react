import {
  ChangeEvent,
  ChangeEventHandler,
  FC,
  Fragment,
  useEffect,
  useRef,
  useState,
} from "react";
import Icon from "./Icon";
import "./Avatar.css";
import Modal from "./Modal";

declare interface AvatarProps {
  avatarId: number; // avatar id
  extraClass?: string;
  id: string;
  prefix?: string; // string that goes before nickname
  disableEdit?: boolean;
  customNickname?: string; // a pre defined nickname
  peerId?: string; // use to keep track which on is which
  onNicknameChange?: (nickname: string) => void;
  onFileSelected?: (peerId: string, input: HTMLInputElement) => void;
}

export const Avatar: FC<AvatarProps> = ({
  avatarId,
  id,
  extraClass,
  prefix,
  disableEdit,
  customNickname,
  peerId,
  onFileSelected,
  onNicknameChange,
}) => {
  const [avatarInfo, setAvatarInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nickname, setNickname] = useState(customNickname ?? "Anonymous");
  const [modalIsOpen, setOpenModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>();
  const fileInputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    if (customNickname) setNickname(customNickname);
  }, [customNickname]);

  useEffect(() => {
    setLoading(true);

    const getAvatar = async () => {
      try {
        let res = await fetch("http://localhost:3001/api/avatar/" + avatarId);
        /**
         * {
         *  "filename": "id.svg",
         *  "name": "fruit-name"
         * }
         */
        let json = await res.json();
        setAvatarInfo(json);
      } catch (error) {
        console.error(error);
        // todo: route to error page or fallback img use
      } finally {
        setLoading(false);
      }
    };

    getAvatar();
  }, [avatarId]);

  const promptForNickname = () => {
    // let customNickname = prompt("Enter your nickname");

    // if (customNickname) {
    //   setNickname(customNickname.substr(0, 15));
    // }
    setOpenModal(true);
  };

  const submitNickname = () => {
    let customNickname = inputRef.current.value;
    if (customNickname) {
      setNickname(customNickname);
      if (onNicknameChange) onNicknameChange(customNickname);
    }

    setOpenModal(false);
  };

  const closePromptForNickname = () => {
    inputRef.current.value = "";
    setOpenModal(false);
  };

  const onClick = () => {
    fileInputRef.current.click();
  };

  const notifyFileChanged: ChangeEventHandler<HTMLInputElement> = (
    e: ChangeEvent
  ) => {
    onFileSelected(peerId, e.target as HTMLInputElement);
  };

  if (!loading && avatarInfo) {
    return (
      <Fragment>
        <div
          className={extraClass ? "avatar " + extraClass : "avatar"}
          id={id}
          data-peerid={peerId}
        >
          <Modal
            isOpen={modalIsOpen}
            onClose={closePromptForNickname}
            onSubmit={submitNickname}
            title="edit nickname"
          >
            <input
              type="text"
              name="nickname"
              ref={inputRef}
              placeholder="Enter a nickname"
              maxLength={12}
            />
          </Modal>
          <div className="img" onClick={onFileSelected ? onClick : null}>
            <Icon filename={avatarInfo.filename} />
          </div>
          <div className="content">
            <span
              className="nickname"
              onClick={disableEdit ? null : promptForNickname}
            >
              <strong>{prefix ? `${prefix}-${nickname}` : nickname}</strong>
            </span>
            <span className="text">{avatarInfo.name}</span>
          </div>
          <input
            type="file"
            name="file"
            ref={fileInputRef}
            hidden
            onChange={notifyFileChanged}
            disabled={onFileSelected === undefined}
          />
        </div>
      </Fragment>
    );
  }

  return null;
};
