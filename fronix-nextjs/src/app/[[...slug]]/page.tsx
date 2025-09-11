'use client';

import React, { useState, useEffect } from 'react';
import CubeIcon from '@/src/components/icons/CubeIcon';
import UserIcon from '@/src/components/icons/UserIcon';
import ChevronUpIcon from '@/src/components/icons/ChevronUpIcon';
import SignInIcon from '@/src/components/icons/SignInIcon';
import SignOutIcon from '@/src/components/icons/SignOutIcon';
import SettingsIcon from '@/src/components/icons/SettingsIcon';
import SunIcon from '@/src/components/icons/SunIcon';
import MoonIcon from '@/src/components/icons/MoonIcon';
import MenuIcon from '@/src/components/icons/MenuIcon';
import ChevronDownIcon from '@/src/components/icons/ChevronDownIcon';
import ArrowDownIcon from '@/src/components/icons/ArrowDownIcon';
import EditIcon from '@/src/components/icons/EditIcon';
import XIcon from '@/src/components/icons/XIcon';
import EyeOpenIcon from '@/src/components/icons/EyeOpenIcon';
import EyeClosedIcon from '@/src/components/icons/EyeClosedIcon';
import PaperclipIcon from '@/src/components/icons/PaperclipIcon';
import SendIcon from '@/src/components/icons/SendIcon';
import StopIcon from '@/src/components/icons/StopIcon';
import SaveIcon from '@/src/components/icons/SaveIcon';
import Sidebar from '@/src/components/chat/Sidebar';
import ChatHeader from '@/src/components/chat/ChatHeader';
import ChatDisplay from '@/src/components/chat/ChatDisplay';
import ChatInput from '@/src/components/chat/ChatInput';
import SettingsModal from '@/src/components/modals/SettingsModal';
import RenameModal from '@/src/components/modals/RenameModal';
import DeleteModal from '@/src/components/modals/DeleteModal';
import SignInModal from '@/src/components/modals/SignInModal';
import { getUserProfile, getChats, UserProfile, Chat, Message, getChatMessages, updateChat, deleteChat } from '@/src/lib/api';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [chatToRename, setChatToRename] = useState<Chat | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const fetchInitialData = async () => {
    const userProfileResult = await getUserProfile();
    if (userProfileResult.success && userProfileResult.data) {
      setUserProfile(userProfileResult.data);
    }

    const chatsResult = await getChats();
    if (chatsResult.success && chatsResult.data) {
      setChats(chatsResult.data);
      if (chatsResult.data.length > 0) {
        setActiveChatId(chatsResult.data[0].id);
      }
    }
  };

  useEffect(() => {
    // Initialize theme from local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeChatId) {
      const fetchChatMessages = async () => {
        const result = await getChatMessages(activeChatId);
        if (result.success && result.data) {
          setMessages(result.data);
        } else {
          console.error("Failed to fetch chat messages:", result.error);
          setMessages([]);
        }
      };
      fetchChatMessages();
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleRenameChat = async (chatId: string, newName: string) => {
    const result = await updateChat(chatId, newName);
    if (result.success && result.data) {
      setChats((prevChats) =>
        prevChats.map((chat) => (chat.id === chatId ? result.data! : chat))
      );
      if (activeChatId === chatId) {
        // If the active chat was renamed, update its title in the header or wherever it's displayed.
        // For now, we'll just log it. A more robust solution might involve updating the active chat object.
        console.log(`Active chat ${chatId} renamed to ${newName}`);
      }
    } else {
      console.error("Failed to rename chat:", result.error);
      alert(result.error || "Failed to rename chat.");
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    const result = await deleteChat(chatId);
    if (result.success) {
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(chats.length > 1 ? chats[0].id : null);
      }
    } else {
      console.error("Failed to delete chat:", result.error);
      alert(result.error || "Failed to delete chat.");
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleOpenSettingsModal = () => {
    setIsSettingsModalOpen(true);
  };

  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  const handleOpenRenameModal = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setChatToRename(chat);
      setIsRenameModalOpen(true);
    }
  };

  const handleCloseRenameModal = () => {
    setIsRenameModalOpen(false);
    setChatToRename(null);
  };

  const handleSaveRename = (newName: string) => {
    if (chatToRename) {
      handleRenameChat(chatToRename.id, newName);
    }
    handleCloseRenameModal();
  };

  const handleOpenDeleteModal = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setChatToDelete(chat);
      setIsDeleteModalOpen(true);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setChatToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (chatToDelete) {
      handleDeleteChat(chatToDelete.id);
    }
    handleCloseDeleteModal();
  };

  const handleSendMessage = async (messageContent: string) => {
    if (!activeChatId) {
      alert("Please select a chat to send messages.");
      return;
    }
    console.log(`Sending message to chat ${activeChatId}: ${messageContent}`);
    // Implement actual send message API call here
    // Update messages state with the new message and AI response
  };

  const handleOpenSignInModal = () => {
    setIsSignInModalOpen(true);
  };

  const handleCloseSignInModal = () => {
    setIsSignInModalOpen(false);
  };

  const handleSignInSuccess = () => {
    fetchInitialData(); // Refresh data after successful sign-in
  };

  const handleDeleteMessage = "Are you sure you want to delete this chat? This action cannot be undone.";

  return (
    <div className="flex flex-row h-full">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        onOpenSettingsModal={handleOpenSettingsModal}
        onOpenSignInModal={handleOpenSignInModal}
        onToggleTheme={handleToggleTheme}
        isDarkMode={isDarkMode}
        userProfile={userProfile}
        chats={chats}
        activeChatId={activeChatId}
        onChatSelect={setActiveChatId}
        onOpenRenameModal={handleOpenRenameModal}
        onOpenDeleteModal={handleOpenDeleteModal}
      />

      <div id="main-container" className="flex-1 flex flex-col min-w-0">
        <ChatHeader onToggleSidebar={handleToggleSidebar} userProfile={userProfile} />
        <ChatDisplay messages={messages} />
        <ChatInput activeChatId={activeChatId} onSendMessage={handleSendMessage} />
      </div>

      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={handleCloseSettingsModal}
        />
      )}
      {isRenameModalOpen && (
        <RenameModal
          isOpen={isRenameModalOpen}
          onClose={handleCloseRenameModal}
          onSave={handleSaveRename}
          initialName={chatToRename?.title}
        />
      )}
      {isDeleteModalOpen && (
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          message={handleDeleteMessage}
          chatTitle={chatToDelete?.title}
        />
      )}
      {isSignInModalOpen && (
        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={handleCloseSignInModal}
          onSignInSuccess={handleSignInSuccess}
        />
      )}
    <div id="chat-actions-dropdown" className="w-32 bg-light-sidebar dark:bg-dark-sidebar rounded-lg shadow-lg border border-light-border dark:border-dark-border"></div>
    </div>
  );
}
