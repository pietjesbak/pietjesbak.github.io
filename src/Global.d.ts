declare module "react-simple-tooltip" {
  interface Props extends React.HTMLAttributes<JSX.Element> {
    arrow?: number;
    background?: string;
    border?: string;
    color?: string;
    content: string | JSX.Element;
    fadeDuration?: number;
    fadeEasing?: number;
    fixed?: boolean;
    fontFamily?: string;
    fontSize?: string;
    padding?: number;
    placement?: "left" | "top" | "right" | "bottom";
    radius?: number;
    zIndex?: number;
  }

  export default class Tooltip extends React.Component<Props> {}
}

interface FacebookEvent {
  start_time: number;
  name: string;
  description: string;
}

interface FirebaseUser {
  uid: string;
  displayName: string;
  photoURL: string;
  admin?: boolean;
}

interface FirebaseMessage {
  title: string;
  body: string;
  date: Date;
}

declare module "*.png";
declare module "*.jpg";
declare module "*.json";
declare module "*.svg";
