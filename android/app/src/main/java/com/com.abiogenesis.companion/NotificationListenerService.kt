package com.abiogenesis.companion

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.content.Intent
import android.util.Log

class NotificationListenerService : NotificationListenerService() {
    companion object {
        const val ACTION_NOTIFICATION = "com.abiogenesis.companion.NOTIFICATION"
        const val ACTION_NOTIFICATION_REMOVED = "com.abiogenesis.companion.NOTIFICATION_REMOVED"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        sendNotificationBroadcast(ACTION_NOTIFICATION, sbn)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        sendNotificationBroadcast(ACTION_NOTIFICATION_REMOVED, sbn)
    }

    private fun sendNotificationBroadcast(action: String, sbn: StatusBarNotification) {
        val extras = sbn.notification.extras
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.bigText")?.toString()
            ?: extras.getCharSequence("android.text")?.toString()
            ?: ""
        val category = sbn.notification.category ?: ""
        val isOngoing = sbn.isOngoing
        val key = sbn.key ?: ""

        if (action == ACTION_NOTIFICATION && title.isEmpty() && text.isEmpty() &&
            !category.contains("call", ignoreCase = true)
        ) {
            return
        }

        Log.d("NotificationListener", "$action: ${sbn.packageName} | $title | cat=$category")

        val intent = Intent(action).apply {
            putExtra("packageName", sbn.packageName)
            putExtra("title", title)
            putExtra("text", text)
            putExtra("category", category)
            putExtra("isOngoing", isOngoing)
            putExtra("key", key)
            setPackage(getPackageName())
        }
        sendBroadcast(intent)
    }
}
