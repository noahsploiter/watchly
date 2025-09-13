"use client";

import { useState, useEffect } from "react";
import { FaPlay } from "react-icons/fa";

export default function Countdown({ participants, onCountdownComplete }) {
  const [countdown, setCountdown] = useState(3);
  const [currentParticipant, setCurrentParticipant] = useState(0);

  useEffect(() => {
    if (countdown <= 0) {
      onCountdownComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onCountdownComplete]);

  useEffect(() => {
    // Cycle through participants during countdown
    const participantTimer = setInterval(() => {
      setCurrentParticipant((prev) => (prev + 1) % participants.length);
    }, 1000);

    return () => clearInterval(participantTimer);
  }, [participants.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center">
        {/* Countdown Circle */}
        <div className="relative mb-8">
          <div className="w-32 h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-6xl font-bold text-white">{countdown}</span>
          </div>
          <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-ping"></div>
        </div>

        {/* Current Participant */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white mb-2">
            {participants[currentParticipant]?.username}
          </h2>
          <p className="text-gray-300">is ready to watch</p>
        </div>

        {/* All Participants */}
        <div className="flex justify-center space-x-2 mb-8">
          {participants.map((participant, index) => (
            <div
              key={participant.userId}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                index === currentParticipant
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 scale-110"
                  : "bg-white/20"
              }`}
            >
              <span className="text-white font-semibold text-sm">
                {participant.username.charAt(0).toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        {/* Movie Starting Message */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <FaPlay className="w-8 h-8 text-purple-300" />
            <h3 className="text-xl font-semibold text-white">
              Movie Starting Soon!
            </h3>
          </div>
          <p className="text-gray-300">
            Get ready for an amazing synchronized viewing experience
          </p>
        </div>
      </div>
    </div>
  );
}
