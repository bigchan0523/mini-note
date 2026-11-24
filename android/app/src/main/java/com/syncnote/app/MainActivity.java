package com.syncnote.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DrivePlugin.class); // 미니드라이브(파일 주고받기)
        super.onCreate(savedInstanceState);
    }
}
