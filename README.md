# 미니노트

폰(안드로이드)과 PC(Windows)에서 같은 Google 계정으로 로그인하면 노트가 실시간으로 동기화되는 컬러 메모 앱입니다.
인터넷이 끊겨도 그대로 쓸 수 있고, 다시 연결되면 자동으로 동기화됩니다.

- 텍스트 노트 / 체크리스트, 9가지 색상, 상단 고정, 휴지통
- 색상 필터, 정렬(수정·생성·색상·제목), 격자/목록 보기, 밝게/어둡게 테마
- 동기화 버튼(상태 표시: 동기화됨 / 동기화 중 / 오프라인)

## 미니드라이브 (폰 ↔ PC 파일 보내기)
상단의 **미니노트** 글자를 누르면 미니드라이브 화면으로 바뀝니다. (다시 누르면 노트로 돌아옴)

- **보내기**: `파일 보내기` 버튼 / PC는 끌어다 놓기·Ctrl+V / 폰은 갤러리·파일 앱에서 공유 → 미니노트
- **받기**: 다른 기기에서 앱이 켜져 있으면 자동으로 받아 `받은 파일 저장 위치` 폴더에 저장 (`변경`으로 폴더 지정)
  - 기본 위치: PC `다운로드\미니드라이브`, 폰 `다운로드/미니드라이브`
- 제한: 파일 하나 300MB, 서버에 쌓이는 총량 900MB, 올린 지 7일 지나면 서버에서 자동 삭제 (받은 파일은 남음)
  - 숫자는 `web/drive.js` 맨 위 설정값에서 바꿀 수 있습니다.
- 원리: 파일을 768KB 조각으로 잘라 Firestore `users/{uid}/drive/…` 에 올림 → Firebase 무료 요금제 그대로, 추가 설정 없음
- 코드: 화면·전송 `web/drive.js`, PC 저장 `electron/main.cjs`(registerDrive), 폰 저장·공유 `android/.../DrivePlugin.java`

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
