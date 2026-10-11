package com.upipulse.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.util.Locale;

@CapacitorPlugin(
    name = "SmsReaderPlugin",
    permissions = {
        @Permission(strings = {Manifest.permission.READ_SMS}, alias = "readSms"),
        @Permission(strings = {Manifest.permission.RECEIVE_SMS}, alias = "receiveSms")
    }
)
public class SmsReaderPlugin extends Plugin {

    private static SmsReaderPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void notifySmsReceived(String body, String address, long date) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("body", body);
            data.put("address", address);
            data.put("date", date);
            instance.notifyListeners("onSmsReceived", data, true);
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        boolean readGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
        boolean receiveGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", readGranted && receiveGranted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
            
            ActivityCompat.requestPermissions(
                getActivity(),
                new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS},
                101
            );
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getHistoricalSms(PluginCall call) {
        int days = call.getInt("days", 90);
        long cutoffTime = System.currentTimeMillis() - ((long) days * 24L * 60L * 60L * 1000L);

        JSArray results = new JSArray();

        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            JSObject res = new JSObject();
            res.put("messages", results);
            res.put("error", "READ_SMS permission not granted");
            call.resolve(res);
            return;
        }

        Uri inboxUri = Uri.parse("content://sms/inbox");
        String[] projection = new String[]{"address", "body", "date"};
        String selection = "date >= ?";
        String[] selectionArgs = new String[]{String.valueOf(cutoffTime)};
        String sortOrder = "date DESC";

        ContentResolver contentResolver = getContext().getContentResolver();
        try (Cursor cursor = contentResolver.query(inboxUri, projection, selection, selectionArgs, sortOrder)) {
            if (cursor != null && cursor.moveToFirst()) {
                int addressIdx = cursor.getColumnIndex("address");
                int bodyIdx = cursor.getColumnIndex("body");
                int dateIdx = cursor.getColumnIndex("date");

                do {
                    String address = addressIdx != -1 ? cursor.getString(addressIdx) : "";
                    String body = bodyIdx != -1 ? cursor.getString(bodyIdx) : "";
                    long date = dateIdx != -1 ? cursor.getLong(dateIdx) : System.currentTimeMillis();

                    if (body != null && isFinancialSms(address, body)) {
                        JSObject msgObj = new JSObject();
                        msgObj.put("address", address);
                        msgObj.put("body", body);
                        msgObj.put("date", date);
                        results.put(msgObj);
                    }
                } while (cursor.moveToNext());
            }
        } catch (Exception e) {
            JSObject res = new JSObject();
            res.put("messages", results);
            res.put("error", e.getMessage());
            call.resolve(res);
            return;
        }

        JSObject res = new JSObject();
        res.put("messages", results);
        call.resolve(res);
    }

    private boolean isFinancialSms(String address, String body) {
        if (body == null || body.length() < 10) return false;
        String b = body.toLowerCase(Locale.ROOT);
        String a = address != null ? address.toLowerCase(Locale.ROOT) : "";

        // Reject non-transactional OTP messages
        if ((b.contains("otp") || b.contains("verification code")) && !b.contains("debited") && !b.contains("credited")) {
            return false;
        }

        // Check if bank/payment sender or contains key financial tokens
        boolean isFinancialSender = a.contains("hdfc") || a.contains("sbi") || a.contains("icici") ||
                                    a.contains("axis") || a.contains("kotak") || a.contains("pnb") ||
                                    a.contains("bob") || a.contains("canara") || a.contains("union") ||
                                    a.contains("paytm") || a.contains("gpay") || a.contains("phonepe") ||
                                    a.contains("cred") || a.contains("indus") || a.contains("idfc") ||
                                    a.contains("yesb") || a.contains("rbl") || a.contains("aubank");

        boolean hasFinancialKeywords = (b.contains("debited") || b.contains("credited") || b.contains("sent rs") ||
                                        b.contains("paid rs") || b.contains("received rs") || b.contains("spent rs") ||
                                        b.contains("avl bal") || b.contains("avail bal") || b.contains("account balance")) &&
                                       (b.contains("rs.") || b.contains("rs ") || b.contains("inr") || b.contains("₹"));

        return isFinancialSender || hasFinancialKeywords;
    }
}
