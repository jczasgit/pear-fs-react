import { FC, Fragment, useEffect, useState } from "react";
import Icon from "./Icon";
import "./Avatar.css";
import Modal from "./Modal";

declare interface AvatarProps {
  id: number;
}

export const Avatar: FC<AvatarProps> = ({ id }) => {
  const [avatarInfo, setAvatarInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nickname, setNickname] = useState("anonymous");
  const [modalIsOpen, setOpenModal] = useState(false);

  useEffect(() => {
    setLoading(true);

    const getAvatar = async () => {
      try {
        let res = await fetch("http://localhost:3001/api/avatar/" + id);
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
        // todo: route to error page
        // todo: or fallback img use
      } finally {
        setLoading(false);
      }
    };

    getAvatar();
  }, [id]);

  const promptForNickname = () => {
    // let customNickname = prompt("Enter your nickname");

    // if (customNickname) {
    //   setNickname(customNickname.substr(0, 15));
    // }
    setOpenModal(true);
  };

  const submitNickname = () => {
    setOpenModal(false);
  };

  const closePromptForNickname = () => {
    setOpenModal(false);
  };

  if (!loading && avatarInfo) {
    return (
      <Fragment>
        <div className="avatar">
          <Modal
            isOpen={modalIsOpen}
            onClose={closePromptForNickname}
            onSubmit={submitNickname}
            title="edit nickname"
          >
            Content
          </Modal>
          <div className="img">
            <Icon filename={avatarInfo.filename} />
          </div>
          <div className="content">
            <span className="nickname" onClick={promptForNickname}>
              <strong>{nickname}</strong>
            </span>
            <span className="text">{avatarInfo.name}</span>
          </div>
        </div>
      </Fragment>
    );
  }

  return null;
};
