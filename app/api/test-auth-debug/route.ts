import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Starting auth debug test...");
    
    // Test 1: Check if client exists
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: "Supabase client not initialized",
        step: "client_check"
      });
    }
    
    console.log("✅ Supabase client exists");
    
    // Test 2: Check if auth exists
    if (!supabase.auth) {
      return NextResponse.json({
        success: false,
        error: "Supabase auth not available",
        step: "auth_check"
      });
    }
    
    console.log("✅ Supabase auth exists");
    
    // Test 3: Try to get session with timeout
    console.log("🔍 Testing getSession...");
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Session timeout")), 5000)
    );
    
    try {
      const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
      console.log("✅ Session call completed:", !!sessionResult);
      
      // Test 4: Try to get user with timeout
      console.log("🔍 Testing getUser...");
      const userPromise = supabase.auth.getUser();
      const userTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("User timeout")), 5000)
      );
      
      try {
        const userResult = await Promise.race([userPromise, userTimeoutPromise]);
        console.log("✅ User call completed:", !!userResult);
        
        return NextResponse.json({
          success: true,
          message: "All auth methods working",
          sessionResult: !!sessionResult,
          userResult: !!userResult,
          timestamp: new Date().toISOString()
        });
        
      } catch (userError) {
        console.error("❌ User call failed:", userError);
        return NextResponse.json({
          success: false,
          error: `User call failed: ${userError instanceof Error ? userError.message : String(userError)}`,
          step: "user_check",
          sessionWorked: true
        });
      }
      
    } catch (sessionError) {
      console.error("❌ Session call failed:", sessionError);
      return NextResponse.json({
        success: false,
        error: `Session call failed: ${sessionError instanceof Error ? sessionError.message : String(sessionError)}`,
        step: "session_check"
      });
    }
    
  } catch (error) {
    console.error("❌ Auth debug failed:", error);
    return NextResponse.json({
      success: false,
      error: `Debug failed: ${error instanceof Error ? error.message : String(error)}`,
      step: "general_error"
    });
  }
} 