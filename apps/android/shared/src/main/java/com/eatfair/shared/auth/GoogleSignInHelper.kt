package com.eatfair.shared.auth

import android.content.Context
import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Task
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Google Sign-In Helper for Dollor.ai Android Apps
 *
 * Usage:
 * 1. Initialize in Activity/Fragment: GoogleSignInHelper.init(context, webClientId)
 * 2. Launch sign-in: launcher.launch(GoogleSignInHelper.getSignInIntent())
 * 3. Handle result: GoogleSignInHelper.handleSignInResult(data) { result -> ... }
 *
 * The webClientId comes from Firebase Console > Authentication > Sign-in method > Google
 */
object GoogleSignInHelper {

    private var googleSignInClient: GoogleSignInClient? = null

    /**
     * Initialize Google Sign-In with web client ID from Firebase
     * Call this in Application.onCreate() or Activity.onCreate()
     *
     * @param context Application or Activity context
     * @param webClientId OAuth 2.0 Web Client ID from Firebase Console
     */
    fun init(context: Context, webClientId: String) {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(webClientId)
            .requestEmail()
            .requestProfile()
            .build()

        googleSignInClient = GoogleSignIn.getClient(context, gso)
    }

    /**
     * Get the sign-in intent to launch with ActivityResultLauncher
     */
    fun getSignInIntent(): Intent {
        return googleSignInClient?.signInIntent
            ?: throw IllegalStateException("GoogleSignInHelper not initialized. Call init() first.")
    }

    /**
     * Handle the sign-in result from ActivityResult
     *
     * @param data Intent data from onActivityResult
     * @param onResult Callback with Result<GoogleSignInAccount>
     */
    fun handleSignInResult(data: Intent?, onResult: (Result<GoogleSignInAccount>) -> Unit) {
        try {
            val task: Task<GoogleSignInAccount> = GoogleSignIn.getSignedInAccountFromIntent(data)
            val account = task.getResult(ApiException::class.java)
            onResult(Result.success(account))
        } catch (e: ApiException) {
            val errorMessage = when (e.statusCode) {
                12501 -> "Sign-in cancelled by user"
                12502 -> "Sign-in currently in progress"
                7 -> "Network error. Please check your connection."
                10 -> "Developer error: Check SHA-1 fingerprint in Firebase Console"
                else -> "Google Sign-In failed: ${e.message}"
            }
            onResult(Result.failure(Exception(errorMessage)))
        } catch (e: Exception) {
            onResult(Result.failure(e))
        }
    }

    /**
     * Get ID token from successful sign-in result
     * This token should be sent to the backend for verification
     */
    fun getIdToken(account: GoogleSignInAccount): String? {
        return account.idToken
    }

    /**
     * Get user email from account
     */
    fun getEmail(account: GoogleSignInAccount): String? {
        return account.email
    }

    /**
     * Get user display name from account
     */
    fun getDisplayName(account: GoogleSignInAccount): String? {
        return account.displayName
    }

    /**
     * Check if user is already signed in with Google
     */
    fun isSignedIn(context: Context): Boolean {
        return GoogleSignIn.getLastSignedInAccount(context) != null
    }

    /**
     * Get the last signed-in account (if any)
     */
    fun getLastSignedInAccount(context: Context): GoogleSignInAccount? {
        return GoogleSignIn.getLastSignedInAccount(context)
    }

    /**
     * Sign out from Google
     */
    suspend fun signOut(): Result<Unit> = suspendCancellableCoroutine { continuation ->
        googleSignInClient?.signOut()?.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                continuation.resume(Result.success(Unit))
            } else {
                continuation.resume(Result.failure(task.exception ?: Exception("Sign out failed")))
            }
        } ?: continuation.resumeWithException(
            IllegalStateException("GoogleSignInHelper not initialized")
        )
    }

    /**
     * Revoke access (disconnect Google account from app)
     */
    suspend fun revokeAccess(): Result<Unit> = suspendCancellableCoroutine { continuation ->
        googleSignInClient?.revokeAccess()?.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                continuation.resume(Result.success(Unit))
            } else {
                continuation.resume(Result.failure(task.exception ?: Exception("Revoke access failed")))
            }
        } ?: continuation.resumeWithException(
            IllegalStateException("GoogleSignInHelper not initialized")
        )
    }
}
