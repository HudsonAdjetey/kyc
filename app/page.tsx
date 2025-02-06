"use client";

import ImageBlur from "@/components/common/ImageBlur";
import { LandingIll } from "@/constants";
import { motion } from "framer-motion";
import React from "react";
import { RiSecurePaymentFill } from "react-icons/ri";
import { FaMoneyBillTransfer, FaStarOfLife } from "react-icons/fa6";

const springTransition = {
  type: "spring",
  stiffness: 100,
  damping: 10,
};

const heroTextAnimation = {
  initial: { x: -100, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
};

const heroImageAnimation = {
  initial: { scale: 0.8, opacity: 0, rotate: -10 },
  animate: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
};

const circleAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: [0, 1.2, 1],
    opacity: 1,
    transition: {
      times: [0, 0.6, 1],
      duration: 1.2,
    },
  },
};

const featureCardAnimation = {
  initial: { scale: 0.5, opacity: 0, y: 50 },
  animate: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const subscribeAnimation = {
  initial: { y: 100, opacity: 0 },
  whileInView: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 50,
      damping: 20,
    },
  },
};

const Home = () => {
  return (
    <main className="px-10 overflow-x-clip min-h-screen container py-10 max-sm:px-5">
      <motion.section className="flex xl:gap-60 lg:gap-32 gap-20 max-md:flex-col-reverse">
        <motion.div className="relative w-[50%] flex items-center max-md:w-full">
          <motion.span
            className="absolute w-full max-md:hidden -z-1"
            variants={circleAnimation}
            initial="initial"
            animate="animate"
          >
            <ImageBlur
              src={LandingIll.GroupingCircle}
              alt=""
              width={300}
              height={400}
              className="w-full h-full"
            />
          </motion.span>
          <div className="relative z-2">
            <motion.h1
              variants={heroTextAnimation}
              initial="initial"
              animate="animate"
              className="text-4xl max-md:max-w-lg tracking-snug max-md:text-2xl"
            >
              Providing you with a <b>secure payment solution.</b>
            </motion.h1>
            <motion.p
              variants={heroTextAnimation}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.2 }}
              className="my-3 text-lg max-md:text-base xl:text-xl max-md:max-w-lg text-gray-700"
            >
              Paymaster is a digital payment gateway that enables you to accept
              payments securely and easily.
            </motion.p>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              className="mt-14 max-sm:w-full flex"
            >
              <motion.a
                href="/verification"
                className="py-5 text-white text-center px-6 rounded-xl bg-orange-500 hover:bg-orange-300 max-sm:w-full  "
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Verification
              </motion.a>
            </motion.div>
          </div>
        </motion.div>
        <motion.div
          variants={heroImageAnimation}
          initial="initial"
          animate="animate"
          className="w-[50%] max-md:w-full flex-grow"
        >
          <ImageBlur
            src={LandingIll.OnlineTransaction}
            alt="grouping transaction"
            width={400}
            height={500}
            className="w-full"
          />
        </motion.div>
      </motion.section>

      <motion.section
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.3 }}
        className="py-10 px-4 mt-32"
      >
        <motion.h2
          initial={{ scale: 0.5, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={springTransition}
          className="text-2xl mb-10 text-center font-semibold text-blue-950"
        >
          Know Us
        </motion.h2>
        <div className="flex xl:gap-60 lg:gap-32 gap-20 max-md:flex-col-reverse">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={springTransition}
            className="w-[40%] max-md:w-full"
          >
            <ImageBlur
              src={LandingIll.AboutSvg}
              alt="grouping transaction"
              width={400}
              height={500}
            />
          </motion.div>
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={springTransition}
            className="relative w-[60%] flex items-center max-md:w-full"
          >
            <div className="relative z-2">
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl max-md:text-2xl leading-[2.5rem]"
              >
                Welcome to Paymaster KYC
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="my-2 text-lg max-md:text-base max-md:max-w-lg text-gray-700"
              >
                Paymaster is a digital payment platform that provides a secure
                and efficient way to make transactions. Our platform is designed
                to make it easy for users to send and receive money, while also
                supporting a variety of currencies and payment methods. We
                strive to make our platform as user-friendly and accessible as
                possible.
              </motion.p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <motion.section className="mt-32">
        <motion.h2
          initial={{ scale: 0.5, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={springTransition}
          className="text-2xl text-center font-semibold text-blue-950"
        >
          Our Key Features
        </motion.h2>
        <motion.div className="grid-cols-3 my-10 grid max-md:grid-cols-2 max-sm:grid-cols-1 gap-5 w-[90%] mx-auto">
          {[
            {
              Icon: RiSecurePaymentFill,
              text: "Paymaster guarantees 100% security and privacy for your transactions.",
            },
            {
              Icon: FaMoneyBillTransfer,
              text: "Paymaster provides a seamless and efficient payment process.",
            },
            {
              Icon: FaStarOfLife,
              text: "Paymaster supports multiple currencies and payment methods.",
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              variants={featureCardAnimation}
              initial="initial"
              whileInView="animate"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
                transition: { duration: 0.2 },
              }}
              transition={{ delay: index * 0.2 }}
              className="flex flex-col rounded-md shadow-orange-50 items-center gap-4 border-orange-100 bg-white shadow-md p-6"
            >
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: index * 0.2 + 0.3, type: "spring" }}
              >
                <feature.Icon size={35} className="text-orange-400" />
              </motion.div>
              <p className="font-semibold text-gray-700">{feature.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        className="my-32"
        variants={subscribeAnimation}
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true }}
      >
        <motion.h2
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl mb-10 text-center font-semibold text-blue-950"
        >
          Subscribe to our newsletter
        </motion.h2>
        <motion.p
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-lg max-w-md mx-auto"
        >
          Sign up for our newsletter to receive exclusive offers, updates, and
          promotions.
        </motion.p>
        <motion.form
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center max-sm:flex-col gap-4 max-w-xl mx-auto max-md:w-full mt-6"
        >
          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="email"
            placeholder="Enter your email address"
            className="border-2 border-gray-300 rounded-md p-4 py-3 w-full"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="py-4 px-8 rounded-md bg-orange-400 text-white hover:bg-orange-300"
            whileInView={{
              focusable: true,
            }}
          >
            Subscribe
          </motion.button>
        </motion.form>
      </motion.section>
    </main>
  );
};

export default Home;
