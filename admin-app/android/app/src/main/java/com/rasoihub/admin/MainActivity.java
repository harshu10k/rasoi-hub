package com.rasoihub.admin;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Android scales WebView text with the phone's font-size setting, which breaks the admin layout on phones set
        // to "Large". Keep text at the size the pages were designed for.
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
