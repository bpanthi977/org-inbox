package com.orginbox

import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  // Ensure getIntent() always returns the latest share intent.
  // ReactActivity.onNewIntent passes to ReactDelegate but does NOT call
  // super.onNewIntent(), which is what updates getIntent() in Android.
  // Without this, ReceiveSharingIntent sees a stale/null intent on every share.
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    intent?.let { setIntent(it) }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "OrgInbox"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
