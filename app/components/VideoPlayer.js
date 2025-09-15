"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  const [videoError, setVideoError] = useState("");

  // Subscribe to SSE: participants/state/chat/reactions/playback
  useEffect(() => {
    const es = new EventSource(`/api/rooms/${room._id}/events`);

    const handleMessage = async (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        if (payload.participants) {
          setParticipants(payload.participants || []);
        }
        const state = payload.roomState || "waiting";
        if (state === "ended" || payload.isActive === false) {
          window.location.href = "/";
          return;
        }
        // Chat messages
        if (payload.type === "chat" && payload.message) {
          setChatMessages((prev) => [...prev, payload.message]);
          setTimeout(() => {
            if (chatRef.current) {
              chatRef.current.scrollTop = chatRef.current.scrollHeight;
            }
          }, 50);
        }
        // Reactions
        if (payload.type === "reaction" && payload.reaction) {
          const r = payload.reaction;
          setReactions((prev) => {
            const next = { ...prev };
            const list = Array.isArray(next[r.type]) ? next[r.type] : [];
            const updated = [
              ...list,
              { id: r.id, username: r.username, timestamp: r.timestamp },
            ];
            const now = Date.now();
            next[r.type] = updated
              .filter((x) => now - new Date(x.timestamp).getTime() <= 3000)
              .slice(-5);
            return next;
          });
        }
        // Playback sync (participants only)
        if (!isHost && payload.type === "playback" && payload.event) {
          const video = videoRef.current;
          if (!video) return;
          const e = payload.event;
          if (e.type === "play") {
            if (video.paused) {
              await video.play();
              setIsPlaying(true);
            }
          } else if (e.type === "pause") {
            if (!video.paused) {
              video.pause();
              setIsPlaying(false);
            }
          } else if (e.type === "seek") {
            const desired = Number(e.videoTime) || 0;
            if (Math.abs(video.currentTime - desired) > 0.3) {
              video.currentTime = desired;
              setCurrentTime(desired);
            }
          }
        }
      } catch (_) {}
    };

    es.onmessage = handleMessage;
    es.addEventListener("snapshot", handleMessage);
    es.onerror = () => {};
    return () => es.close();
  }, [room._id, isHost]);

  // Chat: initial load only; realtime via SSE
  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/rooms/${room._id}/chat`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.success) setChatMessages(data.messages);
      } catch {}
    };
    load();
  }, [room._id]);

  // Reactions: initial load only; realtime via SSE
  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/rooms/${room._id}/reactions`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.success) {
          const now = Date.now();
          const recent = {};
          Object.entries(data.reactions || {}).forEach(([type, list]) => {
            const pruned = (list || []).filter(
              (r) => now - new Date(r.timestamp).getTime() <= 3000
            );
            if (pruned.length) recent[type] = pruned.slice(-5);
          });
          setReactions(recent);
        }
      } catch {}
    };
    load();
  }, [room._id]);

  // Local cleanup to expire overlay reactions quickly (every 500ms)
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const next = {};
      Object.entries(reactions || {}).forEach(([type, list]) => {
        const kept = (list || []).filter(
          (r) => now - new Date(r.timestamp).getTime() <= 2500
        );
        if (kept.length) next[type] = kept;
        if (!list || kept.length !== list.length) changed = true;
      });
      if (changed) setReactions(next);
    }, 500);
    return () => clearInterval(iv);
  }, [reactions]);

  // Remove polling sync-events; playback is handled via SSE above

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
  const [sending, setSending] = useState(false);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
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
    } finally {
      setSending(false);
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
        // Locally fade out the reaction chips after 2 seconds
        setTimeout(() => {
          setReactions((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((k) => {
              if (Array.isArray(next[k]) && next[k].length > 0) {
                next[k] = next[k].slice(-2); // keep last 2 only
              }
            });
            return next;
          });
        }, 2000);
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
            onError={() => {
              setIsLoading(false);
              setVideoError(
                "We couldn't load the video from the provided URL."
              );
            }}
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

          {/* Error Overlay */}
          {videoError && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaTimes className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Video failed to load
                </h2>
                <p className="text-gray-300 mb-6">{videoError}</p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    href="/"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg transition-colors"
                  >
                    Back to Lobby
                  </Link>
                  {isHost && (
                    <button
                      onClick={handleCancelStream}
                      className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg transition-colors"
                    >
                      End Stream
                    </button>
                  )}
                </div>
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
              {/* Unified Progress/Seek Bar */}
              <div className="mb-3">
                <div className="flex items-center gap-3 text-white text-xs sm:text-sm mb-2">
                  <span className="font-mono opacity-80 min-w-[40px] text-right">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(duration, 0.01)}
                    value={currentTime}
                    onChange={(e) =>
                      isHost && handleSeek(parseFloat(e.target.value))
                    }
                    disabled={!isHost}
                    className={`flex-1 h-1 cursor-pointer appearance-none bg-transparent ${
                      !isHost ? "opacity-60 cursor-default" : ""
                    }`}
                    style={{
                      background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${
                        duration ? (currentTime / duration) * 100 : 0
                      }%, rgba(255,255,255,0.2) ${
                        duration ? (currentTime / duration) * 100 : 0
                      }%, rgba(255,255,255,0.2) 100%)`,
                    }}
                  />
                  <span className="font-mono opacity-80 min-w-[40px]">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between gap-3">
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
                  <div className="hidden sm:flex items-center space-x-2">
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

                {/* Viewer count only (cleaner UI) */}
                <div className="hidden sm:flex items-center space-x-2 text-white/80 text-xs sm:text-sm">
                  <span>Viewers:</span>
                  <span className="font-medium">{participants.length}</span>
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
                    aria-label="Toggle chat"
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
          <div className="flex-1 bg-gray-900/60 backdrop-blur-sm border-l border-white/10 flex flex-col">
            {/* Chat Header */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <FaComments className="w-4 h-4 text-purple-300" />
                  <span>Chat</span>
                </h3>
                <span className="text-gray-400 text-xs">
                  {participants.length} viewers
                </span>
              </div>
            </div>

            {/* Chat Messages */}
            <div
              ref={chatRef}
              className="flex-1 overflow-y-auto px-4 pb-4 space-y-4"
            >
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                  <FaComments className="w-7 h-7 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Say hello to start the conversation</p>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div key={message.id} className="flex items-end gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium ${
                            message.isHost ? "text-purple-300" : "text-gray-300"
                          }`}
                        >
                          {message.username}
                        </span>
                        {message.isHost && (
                          <span className="text-[10px] bg-purple-600/30 text-purple-200 px-1.5 py-0.5 rounded">
                            HOST
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className={`inline-block max-w-[85%] text-sm px-3 py-2 rounded-2xl ${
                          message.isHost
                            ? "bg-purple-600/20 text-gray-200"
                            : "bg-white/10 text-gray-200"
                        }`}
                      >
                        {message.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message"
                  className="flex-1 bg-white/5 text-white placeholder-gray-400 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/60 border border-white/10"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    sending
                      ? "bg-purple-600/60 text-white cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
