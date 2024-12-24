import React, { useEffect, useRef, useState } from "react";
import "./chat.css";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import moment from "moment-timezone";

function Chatbox() {
	const { userid, receiverid } = useParams();
	const [users, setUsers] = useState([]); // List of connected users
	const [activeChat, setActiveChat] = useState(receiverid ?? null); // Active chat user
	const [message, setMessage] = useState(""); // Holds the input message
	const [newuser, setnewuser] = useState(null);
	const [chat, setChat] = useState([]);
	const socket = useRef(null);
	useEffect(() => {
		if (!socket.current) {
			socket.current = io(`http://localhost:5555/?userid=${userid}`);
			console.log("Socket connected");
			socket.current.on("existcontact", (data) => {
				setUsers(data);
			});
			// Emit the joinRoom event whenever the activeChat changes
			socket.current.on("userOnline", (data) => {
				setUsers((prevUsers) =>
					prevUsers.map((user) => ({
						...user,
						onlineStatus: data[user.userId]?.online,
					}))
				);
			});
			return () => {
				if (socket.current) {
					socket.current.disconnect();
					socket.current = null;
					console.log("Socket disconnected");
				}
			};
		}
	}, [userid]);
	useEffect(() => {
		if (activeChat) {
			if (socket.current) {
				socket.current.emit("joinRoom", activeChat);
				// Cleanup and leave the room when the activeChat changes
				socket.current.on("loadMessages", (data) => {
					setChat(data.messages); // Update chat state
					console.log(data);
				});
				socket.current.on("newMessage", (data) => {
					console.log("New message received:", data);
					setChat((prevChat) => [
						...prevChat,
						{
							status: data.status,
							message: data.message,
							senderId: data.senderId,
							timestamp: data.timestamp,
							lastMessage: data.message,
						},
					]);
				});
				return () => {
					if (socket.current)
						console.log(socket.current.emit("leaveRoom", activeChat));
				};
			}
		}
	}, [activeChat, newuser]);

	// Function to send a message to the server
	const sendMessage = () => {
		if (activeChat && !users.some((user) => user.userId === activeChat)) {
			setnewuser(activeChat); // Update `newuser`
		}
		if (message.trim() && socket.current) {
			socket.current.emit("message", { activeChat, message }); // Send the message to the server
			setChat((prevChat) => {
				return prevChat.map((chat) => {
					if (chat.userId === activeChat) {
						return { ...chat, lastMessage: message }; // Update the lastMessage for the active chat
					}
					return chat; // Return unchanged chat objects
				});
			});
			setMessage(""); // Clear the input field
		}
	};

	// Function to handle pressing Enter key to send a message
	const send = (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			sendMessage();
		}
	};

	return (
		<div style={{ backgroundColor: "rgb(8, 8, 43)" }} className="parent_chat">
			<div style={{ display: "flex", padding: "0 5rem", gap: "5px" }}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "6px",
						width: "25%",
						background: "rgb(255, 255, 255)",
						border: "2px solid #ccc",
						borderRadius: "20px 10px",
						padding: "8px 6px",
						cursor: "default",
					}}>
					{users.map((user) => (
						<div
							className={`chat_person ${
								activeChat === user.userId ? "selected" : ""
							}`}
							key={user.userId}
							onClick={(e) => setActiveChat(user.userId)}>
							<img
								style={{
									height: "50px",
									width: "50px",
									borderRadius: "50%",
									objectFit: "cover",
									objectPosition: "top center",
								}}
								src={user.profile}
								alt="Empty"
							/>
							<div style={{ width: "80%" }}>
								<p style={{ margin: "0 0 0 5px", fontSize: "14px" }}>
									{user.name}
								</p>
								<div style={{ display: "flex" }}>
									<p
										style={{
											margin: "0 0 0 5px",
											color: "#777",
											width: "80%",
											fontSize: "13px",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}>
										{user.lastMessage}
									</p>
									<p
										style={{
											margin: "0 0 0 5px",
											fontSize: "10px",
											alignSelf: "flex-end",
											justifySelf: "flex-end",
											width: "20%",
										}}>
										{moment(user.updatedAt).tz("Asia/Kolkata").format("h:mm A")}
									</p>
								</div>
								<div
									style={{
										fontSize: "12px",
										color: user.onlineStatus ? "green" : "gray",
									}}>
									{user.onlineStatus ? "Online" : "Offline"}
								</div>
							</div>
						</div>
					))}
				</div>
				<div
					style={{
						width: "75%",
						border: "2px solid #ccc",
						borderRadius: "20px 10px",
						backgroundColor: "#fff",
						height: "85vh",
					}}>
					{activeChat ? (
						<>
							<div className="chat_shower">
								{chat.map((msg, index) => (
									<p
										className={msg.senderId === userid ? "client" : "server"}
										key={index}>
										<span
											style={{
												fontSize: "14px",
												color: "rgb(235, 29, 29)",
												fontWeight: "600",
											}}>
											{users.find((user) => user.userId === msg.senderId)?.name}
										</span>
										{msg.message}
										<div
											style={{
												fontSize: "12px",
												alignSelf: msg.senderId === userid ? "end" : "start",
												color: msg.senderId === userid ? "#d6d6d6" : "#111",
											}}>
											{userid !== msg.receiverId ? (
												<>
													{msg.status === "Delivered" ? (
														<i class="fa-solid fa-check"></i>
													) : (
														<i class="fa-solid fa-check-double"></i>
													)}
												</>
											) : null}
											<span style={{marginLeft:"3px"}}>
												{moment(msg.Timestamp)
													.tz("Asia/Kolkata")
													.format("h:mm A")}
											</span>
										</div>
									</p>
								))}
							</div>
							<div
								style={{
									display: "flex",
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px",
									borderRadius: "50px",
									padding: "0 10px",
									margin: "1% 8%",
								}}>
								<input
									className="text"
									type="text"
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									placeholder="Type your message..."
									onKeyDown={send}
								/>
								<button className="sendmessage" onClick={sendMessage}>
									<i className="fa-sharp-duotone fa-solid fa-paper-plane"></i>
								</button>
							</div>
						</>
					) : (
						<div className="chat_shower no_data">
							<p>
								<span style={{ fontSize: "1.5rem", marginRight: "10px" }}>
									👈
								</span>
								Click an agent to start a conversation about property details.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default Chatbox;
