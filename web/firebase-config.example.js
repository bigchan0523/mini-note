// 이 파일을 같은 폴더에 firebase-config.js 로 복사한 뒤 값을 채우세요. (firebase-config.js는 git에 올라가지 않음)
// ▼ Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹 </>) 에서 복사한 값
//   비워두면 '로컬 모드'(이 기기에만 저장, 동기화 없음)로만 동작합니다.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",

  // ▼ PC 앱 Google 로그인용 (Google Cloud 콘솔 > Google 인증 플랫폼 > 클라이언트 > '데스크톱 앱')
  googleDesktop: {
    clientId: "",
    clientSecret: ""
  }
};
