import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { SelfieService } from "@/lib/services/selfieService"
import { getIronSession } from "iron-session"

const sessionOptions = {
  password: process.env.SESSION_PASSWORD || "complex_password_at_least_32_characters_long",
  cookieName: "selfie_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
}

type SessionData = {
  userId?: string
  isLoggedIn?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Creating new user", { userId: body.userId })

    const existingUser = await SelfieService.checkUserExist(body.userId)

    if (existingUser) {
      return NextResponse.json(
        {
          error: "User ID already exists",
        },
        { status: 409 },
      )
    }

    const newUser = await SelfieService.initializeVerification(
      body.userId,
      body.fullName,
      body.country,
      body.phoneNumber,
    )

    logger.info("User created successfully", { userId: newUser.id })

    const response = NextResponse.json(
      {
        message: "User created successfully",
        user: newUser,
      },
      { status: 201 },
    )

    const session = await getIronSession<SessionData>(request, response, sessionOptions)

    session.userId = newUser.id
    session.isLoggedIn = true

    // Save the session
    await session.save()

    return response
  } catch (error) {
    logger.error("Error creating user", error as Error)

    if ((error as Error).message.includes("validation failed")) {
      return NextResponse.json(
        {
          error: "Invalid user data",
          details: (error as Error).message,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to create user",
        details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      },
      { status: 500 },
    )
  }
}

