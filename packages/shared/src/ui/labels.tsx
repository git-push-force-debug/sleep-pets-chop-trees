import { createContext, useContext } from 'react';

/** Text in the shared chat UI. The admin panel uses English; the website passes its current language. */
export const UI_EN = {
  source: 'Source: ',
  sources: 'Sources: ',
  tip: 'Tip',
  info: 'Good to know',
  warning: 'Heads up',
  openPicture: 'Open picture: ',
  closePicture: 'Close picture',
  handoffAsk: 'Want me to bring in a person from the team?',
  handoffDeclined: 'No problem — ask me something else anytime.',
  handoffYes: 'Yes, talk to a person',
  handoffNo: 'No thanks',
  solvedYes: "Yes, it's solved",
  solvedNo: 'No, I still need help',
};
export type UiLabels = typeof UI_EN;

export const UI_ZH: UiLabels = {
  source: '来源：',
  sources: '来源：',
  tip: '小提示',
  info: '须知',
  warning: '注意',
  openPicture: '打开图片：',
  closePicture: '关闭图片',
  handoffAsk: '要我请团队成员来帮你吗？',
  handoffDeclined: '没问题，随时可以再问我别的。',
  handoffYes: '好的，联系团队成员',
  handoffNo: '不用了',
  solvedYes: '是的，已解决',
  solvedNo: '没有，我还需要帮助',
};

export const UiLabelsContext = createContext<UiLabels>(UI_EN);
export const useUiLabels = () => useContext(UiLabelsContext);
