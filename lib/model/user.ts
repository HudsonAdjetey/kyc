import mongoose, { Schema, type Document } from "mongoose"

export interface UserInterface extends Document {
  userId: string
  fullName: string
  email: string
  country: string
  phoneNumber: string
  percentage: number
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<UserInterface>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    country: {
      type: String,
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\+?[\d\s-]{8,}$/.test(v),
        message: "Please enter a valid phone number",
      },
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

UserSchema.index({ country: 1, percentage: 1 })

export const User = mongoose.models.User || mongoose.model<UserInterface>("User", UserSchema)

