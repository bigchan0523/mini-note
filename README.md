# 미니노트

폰(안드로이드)과 PC(Windows)에서 같은 Google 계정으로 로그인하면 노트가 실시간으로 동기화되는 컬러 메모 앱입니다.
인터넷이 끊겨도 그대로 쓸 수 있고, 다시 연결되면 자동으로 동기화됩니다.

- 텍스트 노트 / 체크리스트, 9가지 색상, 상단 고정, 휴지통
- 색상 필터, 정렬(수정·생성·색상·제목), 격자/목록 보기, 밝게/어둡게 테마
- 동기화 버튼(상태 표시: 동기화됨 / 동기화 중 / 오프라인)

## 구조
| 폴더 | 내용 |
| --- | --- |
| `web/` | 공통 화면과 로직 (Vite) |
| `electron/` | Windows 앱 (Electron, Google 로그인은 기본 브라우저 + PKCE) |
| `android/` | 안드로이드 앱 (Capacitor 8) |
| `firestore.rules` | Firestore 보안 규칙 (본인 노트만 읽고 쓰기) |

동기화는 Firebase Authentication(Google 로그인) + Cloud Firestore(오프라인 캐시)로 합니다.

## 처음 설정
1. `web/firebase-config.example.js`를 `web/firebase-config.js`로 복사하고 값을 채웁니다.
2. Firebase 콘솔에서 받은 `google-services.json`을 `android/app/`에 넣습니다.
3. 자세한 순서는 [설정방법.md](설정방법.md)를 참고하세요.

## 빌드
```powershell
npm install
npm run dist:win                              # PC 설치 파일 → release\
npm run android:sync                          # 화면을 안드로이드 프로젝트에 복사
cd android; .\gradlew.bat assembleDebug       # APK → android\app\build\outputs\apk\debug\
```

필요한 것: Node.js, JDK 21, Android SDK
