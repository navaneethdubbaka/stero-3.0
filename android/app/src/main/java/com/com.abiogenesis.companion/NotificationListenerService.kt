package com.abiogenesis.companion

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.content.Intent
import android.util.Log

class NotificationListenerService : NotificationListenerService() {
    companion object {
        const val ACTION_NOTIFICATION = "com.abiogenesis.companion.NOTIFICATION"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        
        val extras = sbn.notification.extras
        val title = extras.getString("android.title") ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""

        if (title.isEmpty() && text.isEmpty()) {
            return
        }

        Log.d("NotificationListener", "Notification received: $packageName | Title: $title | Text: $text")

        val intent = Intent(ACTION_NOTIFICATION).apply {
            putExtra("packageName", packageName)
            putExtra("title", title)
            putExtra("text", text)
            setPackage(getPackageName()) // Limit broadcast intent scope to our app package only
        }
        sendBroadcast(intent)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        // Optional: Could emit notification removal event if needed in future
    }
}
