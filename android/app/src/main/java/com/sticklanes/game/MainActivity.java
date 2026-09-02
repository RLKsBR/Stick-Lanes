package com.sticklanes.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private boolean fullscreen = false;

    private static final String GAME_URL = "file:///android_asset/index.html";

    private static final String NATIVE_FULLSCREEN_HOOK =
            "(function(){" +
            "function sync(){" +
            "var b=document.getElementById('fullscreenToggle');if(!b)return false;" +
            "var on=false;try{on=!!AndroidGame.isFullscreen();}catch(e){}" +
            "b.disabled=false;" +
            "var text=on?'×':'⛶';if(b.textContent!==text)b.textContent=text;" +
            "b.setAttribute('aria-label',on?'Sair da tela cheia':'Entrar em tela cheia horizontal');" +
            "b.setAttribute('aria-pressed',on?'true':'false');" +
            "b.title=on?'Sair da tela cheia':'Tela cheia horizontal';" +
            "return true;" +
            "}" +
            "function bind(){" +
            "var b=document.getElementById('fullscreenToggle');if(!b)return false;" +
            "if(b.dataset.nativeBound!=='1'){" +
            "b.dataset.nativeBound='1';" +
            "b.addEventListener('click',function(e){" +
            "e.preventDefault();e.stopImmediatePropagation();" +
            "try{AndroidGame.toggleFullscreen();}catch(err){console.warn(err);}" +
            "setTimeout(sync,100);" +
            "},true);" +
            "}" +
            "sync();return true;" +
            "}" +
            "window.__slSyncNativeFullscreen=sync;" +
            "bind();setTimeout(bind,100);setTimeout(bind,350);setTimeout(bind,900);" +
            "window.addEventListener('resize',function(){setTimeout(sync,50);},{passive:true});" +
            "window.addEventListener('orientationchange',function(){setTimeout(sync,100);},{passive:true});" +
            "})();";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setKeepScreenOn(true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(false);
        }

        webView.addJavascriptInterface(new AndroidGameBridge(), "AndroidGame");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.startsWith("file:///android_asset/")) {
                    view.evaluateJavascript(NATIVE_FULLSCREEN_HOOK, null);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleExternalUrl(request.getUrl().toString());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleExternalUrl(url);
            }
        });

        setContentView(webView);

        if (savedInstanceState == null) {
            webView.clearCache(true);
            webView.loadUrl(GAME_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private boolean handleExternalUrl(String url) {
        if (url == null || url.startsWith("file:///android_asset/")) {
            return false;
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (Exception ignored) {
                // O jogo local continua funcionando mesmo sem app externo para o link.
            }
            return true;
        }
        return false;
    }

    private void setFullscreen(boolean enabled) {
        fullscreen = enabled;
        setRequestedOrientation(enabled
                ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(!enabled);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                int bars = WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars();
                if (enabled) {
                    controller.hide(bars);
                    controller.setSystemBarsBehavior(
                            WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    );
                } else {
                    controller.show(bars);
                }
            }
        } else {
            View decor = getWindow().getDecorView();
            if (enabled) {
                decor.setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                        View.SYSTEM_UI_FLAG_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                );
            } else {
                decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
            }
        }

        if (webView != null) {
            webView.postDelayed(() -> webView.evaluateJavascript(
                    "window.__slSyncNativeFullscreen&&window.__slSyncNativeFullscreen();", null
            ), 80);
        }
    }

    public final class AndroidGameBridge {
        @JavascriptInterface
        public void toggleFullscreen() {
            runOnUiThread(() -> setFullscreen(!fullscreen));
        }

        @JavascriptInterface
        public boolean isFullscreen() {
            return fullscreen;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) {
            webView.saveState(outState);
        }
        super.onSaveInstanceState(outState);
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (fullscreen) {
            setFullscreen(false);
            return;
        }
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidGame");
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
