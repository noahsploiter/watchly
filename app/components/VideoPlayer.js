"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaHeart,
  FaLaugh,
  FaThumbsUp,
  FaFire,
  FaSadTear,
  FaAngry,
  FaComments,
  FaUser,
  FaCrown,
  FaTimes,
} from "react-icons/fa";

export default function VideoPlayer({ room, isHost, onRoomUpdate }) {
  const { user } = useAuth();

  console.log(
    "VideoPlayer rendered - isHost:",
    isHost,
    "user:",
    user?.username
  );
  const videoRef = useRef(null);
  const chatRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [participants, setParticipants] = useState(room.participants || []);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [reactions, setReactions] = useState({});
  const [showReactions, setShowReactions] = useState(false);

  // Sync with server state and video events
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/rooms/${room._id}`);
        const data = await response.json();
        if (data.success) {
          setParticipants(data.room.participants || []);
        }
      } catch (error) {
        console.error("Error syncing room:", error);
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [room._id]);

  // Sync chat messages
  useEffect(() => {
    const fetchChatMessages = async () => {
      try {
        const response = await fetch(`/api/rooms/${room._id}/chat`);
        if (!response.ok) {
          console.error("Failed to fetch chat messages:", response.status);
          return;
        }
        const data = await response.json();
        if (data.success) {
          setChatMessages(data.messages);
        }
      } catch (error) {
        console.error("Error fetching chat messages:", error);
        // Don't retry on network errors to prevent resource exhaustion
        if (
          error.name === "TypeError" &&
          error.message.includes("Failed to fetch")
        ) {
          console.log("Network error, stopping chat polling");
          return;
        }
      }
    };

    // Fetch initial messages
    fetchChatMessages();

    // Poll for new messages every 1 second for real-time feel
    const chatInterval = setInterval(fetchChatMessages, 3000);
    return () => clearInterval(chatInterval);
  }, [room._id]);

  // Sync reactions
  useEffect(() => {
    const fetchReactions = async () => {
      try {
        const response = await fetch(`/api/rooms/${room._id}/reactions`);
        if (!response.ok) {
          console.error("Failed to fetch reactions:", response.status);
          return;
        }
        const data = await response.json();
        if (data.success) {
          setReactions(data.reactions);
        }
      } catch (error) {
        console.error("Error fetching reactions:", error);
        // Don't retry on network errors to prevent resource exhaustion
        if (
          error.name === "TypeError" &&
          error.message.includes("Failed to fetch")
        ) {
          console.log("Network error, stopping reaction polling");
          return;
        }
      }
    };

    // Fetch initial reactions
    fetchReactions();

    // Poll for new reactions every 1 second for real-time feel
    const reactionsInterval = setInterval(fetchReactions, 3000);
    return () => clearInterval(reactionsInterval);
  }, [room._id]);

  // Listen for video sync events (for participants)
  useEffect(() => {
    if (isHost) return; // Host doesn't need to listen for sync events

    let lastProcessedEvent = null;

    const syncVideoEvents = async () => {
      try {
        const response = await fetch(`/api/rooms/${room._id}/sync-events`);
        const data = await response.json();
        if (data.success && data.events && data.events.length > 0) {
          const video = videoRef.current;
          if (!video) return;

          // Process only new events
          const newEvents = data.events.filter(
            (event) =>
              !lastProcessedEvent || event.timestamp > lastProcessedEvent
          );

          if (newEvents.length > 0) {
            lastProcessedEvent = newEvents[0].timestamp;

            // Process the most recent event
            const latestEvent = newEvents[0];
            console.log("Processing video event:", latestEvent);

            if (latestEvent.type === "play" && video.paused) {
              await video.play();
              setIsPlaying(true);
            } else if (latestEvent.type === "pause" && !video.paused) {
              video.pause();
              setIsPlaying(false);
            } else if (latestEvent.type === "seek") {
              const timeDiff = Math.abs(
                video.currentTime - latestEvent.videoTime
              );
              if (timeDiff > 1) {
                // Only seek if difference is more than 1 second
                video.currentTime = latestEvent.videoTime;
                setCurrentTime(latestEvent.videoTime);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error syncing video events:", error);
      }
    };

    // Check for video events every 2 seconds to prevent resource exhaustion
    const videoSyncInterval = setInterval(syncVideoEvents, 2000);
    return () => clearInterval(videoSyncInterval);
  }, [room._id, isHost]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      // Don't auto-play - let host control when to start
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [isHost]);

  // Host controls
  const handlePlayPause = async () => {
    const video = videoRef.current;
    if (!video || !isHost) {
      console.log("Not host or no video element");
      return; // Only host can control playback
    }

    console.log(
      "Host: handlePlayPause called, video.paused:",
      video.paused,
      "video.readyState:",
      video.readyState
    );

    // Remove readyState check - always try to broadcast
    console.log(
      "Video readyState:",
      video.readyState,
      "currentTime:",
      video.currentTime
    );

    if (video.paused) {
      try {
        await video.play();
        setIsPlaying(true);
        // Broadcast play event to all participants
        await broadcastEvent({ type: "play", timestamp: video.currentTime });
        console.log("Host: Broadcasting play event at", video.currentTime);
      } catch (error) {
        console.error("Error playing video:", error);
      }
    } else {
      video.pause();
      setIsPlaying(false);
      // Broadcast pause event to all participants
      await broadcastEvent({ type: "pause", timestamp: video.currentTime });
      console.log("Host: Broadcasting pause event at", video.currentTime);
    }
  };

  const handleSeek = async (newTime) => {
    if (!isHost) return;

    const video = videoRef.current;
    if (!video) return;

    video.currentTime = newTime;
    setCurrentTime(newTime);

    // Broadcast seek event to all participants
    await broadcastEvent({ type: "seek", timestamp: newTime });
    console.log("Host: Broadcasting seek event to", newTime);
  };

  const handleVolumeChange = (newVolume) => {
    const video = videoRef.current;
    if (!video) return;

    setVolume(newVolume);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const handleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const broadcastEvent = async (event) => {
    if (!room || !room._id) {
      console.error("Cannot broadcast event: room not initialized");
      return;
    }

    console.log("broadcastEvent called with:", event);
    try {
      const response = await fetch(`/api/rooms/${room._id}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(event),
      });

      const data = await response.json();
      if (!data.success) {
        console.error("Failed to broadcast event:", data.error);
      } else {
        console.log("Event broadcasted successfully:", event);
      }
    } catch (error) {
      console.error("Error broadcasting event:", error);
    }
  };

  // Cleanup function to clear all intervals
  useEffect(() => {
    return () => {
      console.log("VideoPlayer component unmounting, clearing intervals");
    };
  }, []);

  // Chat functions
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`/api/rooms/${room._id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ message: newMessage }),
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage("");
        // Auto-scroll to bottom
        setTimeout(() => {
          if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  // Reaction functions
  const addReaction = async (reactionType) => {
    try {
      const response = await fetch(`/api/rooms/${room._id}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ type: reactionType }),
      });

      const data = await response.json();
      if (data.success) {
        setShowReactions(false);
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const reactionTypes = [
    { type: "like", icon: FaThumbsUp, color: "text-blue-500" },
    { type: "love", icon: FaHeart, color: "text-red-500" },
    { type: "laugh", icon: FaLaugh, color: "text-yellow-500" },
    { type: "fire", icon: FaFire, color: "text-orange-500" },
    { type: "sad", icon: FaSadTear, color: "text-blue-400" },
    { type: "angry", icon: FaAngry, color: "text-red-600" },
  ];

  // Cancel stream function
  const handleCancelStream = async () => {
    if (!isHost) {
      console.log("Not host, cannot cancel stream");
      return;
    }

    console.log("Cancel stream clicked, room ID:", room._id);

    if (
      window.confirm(
        "Are you sure you want to end this stream? This will remove the room from the lobby."
      )
    ) {
      try {
        console.log("Sending end room request...");
        const response = await fetch(`/api/rooms/${room._id}/end`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        console.log("End room response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("Room ended successfully:", data);
          // Redirect to lobby
          window.location.href = "/";
        } else {
          const errorData = await response.json();
          console.error("Failed to end room:", errorData);
          alert(`Failed to end room: ${errorData.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Error ending room:", error);
        alert(`Error ending room: ${error.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Video Container */}
        <div
          className="relative bg-black"
          style={{ height: showChat ? "60vh" : "100vh" }}
          onMouseMove={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          <video
            ref={videoRef}
            src={room.movieUrl}
            className="w-full h-full object-contain"
            onLoadStart={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={
              isHost
                ? (e) => {
                    e.preventDefault();
                    console.log("Video clicked - host mode");
                    handlePlayPause();
                  }
                : undefined
            }
            controls={false}
            disablePictureInPicture
          />

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-white">Loading video...</p>
              </div>
            </div>
          )}

          {/* Host Indicator */}
          {isHost && (
            <div className="absolute top-4 left-4 flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2">
                <FaCrown className="w-4 h-4" />
                <span>You are the host</span>
              </div>
              <button
                onClick={handleCancelStream}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 transition-colors duration-200"
              >
                <FaTimes className="w-4 h-4" />
                <span>End Stream</span>
              </button>
            </div>
          )}

          {/* Reaction Overlay */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            {Object.entries(reactions).map(([type, reactionList]) => (
              <div key={type} className="flex flex-col space-y-1">
                {reactionList.slice(-3).map((reaction) => (
                  <div
                    key={reaction.id}
                    className="bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2 animate-bounce"
                  >
                    <span className="text-lg">
                      {reactionTypes.find((r) => r.type === type)?.icon &&
                        React.createElement(
                          reactionTypes.find((r) => r.type === type).icon,
                          {
                            className: reactionTypes.find(
                              (r) => r.type === type
                            ).color,
                          }
                        )}
                    </span>
                    <span className="text-xs">{reaction.username}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Video Controls Overlay */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center space-x-3 text-white text-sm mb-2">
                  <span className="font-mono">{formatTime(currentTime)}</span>
                  <div className="flex-1 bg-white/20 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    ></div>
                  </div>
                  <span className="font-mono">{formatTime(duration)}</span>
                </div>

                {/* Seek Bar - Only for Host */}
                {isHost && (
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full h-1 bg-transparent cursor-pointer appearance-none"
                    style={{
                      background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${
                        (currentTime / duration) * 100
                      }%, rgba(255,255,255,0.2) ${
                        (currentTime / duration) * 100
                      }%, rgba(255,255,255,0.2) 100%)`,
                    }}
                  />
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Play/Pause Button - Only for Host */}
                  {isHost && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Play/Pause button clicked!");
                        handlePlayPause();
                      }}
                      className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
                    >
                      {isPlaying ? (
                        <FaPause className="w-5 h-5 text-white" />
                      ) : (
                        <FaPlay className="w-5 h-5 text-white ml-1" />
                      )}
                    </button>
                  )}

                  {/* Volume Control - Available for all users */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleMute}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200"
                    >
                      {isMuted ? (
                        <FaVolumeMute className="w-4 h-4 text-white" />
                      ) : (
                        <FaVolumeUp className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) =>
                        handleVolumeChange(parseFloat(e.target.value))
                      }
                      className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Participants */}
                <div className="flex items-center space-x-2">
                  <span className="text-white text-sm">Viewers:</span>
                  {participants.map((participant) => (
                    <div
                      key={participant.userId}
                      className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center relative"
                    >
                      <span className="text-white text-xs font-semibold">
                        {participant.username.charAt(0).toUpperCase()}
                      </span>
                      {participant.userId === room.hostId && (
                        <FaCrown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Right Controls */}
                <div className="flex items-center space-x-2">
                  {/* Reaction Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowReactions(!showReactions)}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200"
                    >
                      <FaHeart className="w-4 h-4 text-red-500" />
                    </button>

                    {showReactions && (
                      <div className="absolute bottom-12 right-0 bg-gray-800 rounded-lg p-2 flex space-x-2 shadow-lg">
                        {reactionTypes.map((reaction) => {
                          const IconComponent = reaction.icon;
                          return (
                            <button
                              key={reaction.type}
                              onClick={() => addReaction(reaction.type)}
                              className={`w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 ${reaction.color}`}
                            >
                              <IconComponent className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Chat Toggle */}
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200"
                  >
                    <FaComments className="w-4 h-4 text-white" />
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    onClick={() => videoRef.current?.requestFullscreen()}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200"
                  >
                    <FaExpand className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Section */}
        {showChat && (
          <div className="flex-1 bg-gray-800 flex flex-col">
            {/* Chat Header */}
            <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center space-x-2">
                  <FaComments className="w-4 h-4" />
                  <span>Chat</span>
                </h3>
                <span className="text-gray-300 text-sm">
                  {participants.length} viewers
                </span>
              </div>
            </div>

            {/* Chat Messages */}
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <FaComments className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.isHost
                          ? "bg-gradient-to-r from-purple-500 to-pink-500"
                          : "bg-gray-600"
                      }`}
                    >
                      {message.isHost ? (
                        <FaCrown className="w-4 h-4 text-white" />
                      ) : (
                        <FaUser className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-semibold text-sm ${
                            message.isHost ? "text-purple-400" : "text-white"
                          }`}
                        >
                          {message.username}
                        </span>
                        {message.isHost && (
                          <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                            HOST
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-200 text-sm mt-1">
                        {message.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div className="bg-gray-700 p-4 border-t border-gray-600">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={sendMessage}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
