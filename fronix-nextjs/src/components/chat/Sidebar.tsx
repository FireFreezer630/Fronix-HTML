import React from 'react';
import CubeIcon from '@/src/components/icons/CubeIcon';
import UserIcon from '@/src/components/icons/UserIcon';
import ChevronUpIcon from '@/src/components/icons/ChevronUpIcon';
import SignInIcon from '@/src/components/icons/SignInIcon';
import SignOutIcon from '@/src/components/icons/SignOutIcon';
import SettingsIcon from '@/src/components/icons/SettingsIcon';
import SunIcon from '@/src/components/icons/SunIcon';
import MoonIcon from '@/src/components/icons/MoonIcon';
import RenameIcon from '@/src/components/icons/RenameIcon';
import DeleteChatIcon from '@/src/components/icons/DeleteChatIcon';
import { UserProfile, Chat, createChat } from '@/src/lib/api'; // Import interfaces

interface SidebarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSettingsModal: () => void;
  onOpenSignInModal: () => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
  userProfile: UserProfile | null;
  chats: Chat[];
  activeChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onOpenRenameModal: (chatId: string) => void; // Modified to accept chatId
  onOpenDeleteModal: (chatId: string) => void; // Modified to accept chatId
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenSettingsModal,
  onOpenSignInModal,
  onToggleTheme,
  isDarkMode,
  userProfile,
  chats,
  activeChatId,
  onChatSelect,
  onOpenRenameModal,
  onOpenDeleteModal,
}) => {
  const handleNewChat = async () => {
    if (!userProfile) {
      alert("Please sign in to create a new chat.");
      onOpenSignInModal();
      return;
    }
    const result = await createChat();
    if (result.success && result.data) {
      onChatSelect(result.data.id);
    } else {
      alert(result.error || "Failed to create new chat.");
    }
  };

  return (
    <aside id="sidebar" className={`bg-light-sidebar dark:bg-dark-sidebar flex-shrink-0 flex flex-col w-[260px] ${isSidebarOpen ? '' : '-translate-x-full md:translate-x-0'} transition-transform duration-300 ease-in-out`}>
      <div className="p-4 flex items-center gap-3">
        <CubeIcon className="text-accent" />
        <span className="text-xl font-bold">Fronix</span>
      </div>
      <div className="p-2"><button id="new-chat" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105" onClick={handleNewChat}><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M2.6687 11.333V8.66699C2.6687 7.74455 2.66841 7.01205 2.71655 6.42285C2.76533 5.82612 2.86699 5.31731 3.10425 4.85156L3.25854 4.57617C3.64272 3.94975 4.19392 3.43995 4.85229 3.10449L5.02905 3.02149C5.44666 2.84233 5.90133 2.75849 6.42358 2.71582C7.01272 2.66769 7.74445 2.66797 8.66675 2.66797H9.16675C9.53393 2.66797 9.83165 2.96586 9.83179 3.33301C9.83179 3.70028 9.53402 3.99805 9.16675 3.99805H8.66675C7.7226 3.99805 7.05438 3.99834 6.53198 4.04102C6.14611 4.07254 5.87277 4.12568 5.65601 4.20313L5.45581 4.28906C5.01645 4.51293 4.64872 4.85345 4.39233 5.27149L4.28979 5.45508C4.16388 5.7022 4.08381 6.01663 4.04175 6.53125C3.99906 7.05373 3.99878 7.7226 3.99878 8.66699V11.333C3.99878 12.2774 3.99906 12.9463 4.04175 13.4688C4.08381 13.9833 4.16389 14.2978 4.28979 14.5449L4.39233 14.7285C4.64871 15.1465 5.01648 15.4871 5.45581 15.7109L5.65601 15.7969C5.87276 15.8743 6.14614 15.9265 6.53198 15.958C7.05439 16.0007 7.72256 16.002 8.66675 16.002H11.3337C12.2779 16.002 12.9461 16.0007 13.4685 15.958C13.9829 15.916 14.2976 15.8367 14.5447 15.7109L14.7292 15.6074C15.147 15.3511 15.4879 14.9841 15.7117 14.5449L15.7976 14.3447C15.8751 14.128 15.9272 13.8546 15.9587 13.4688C16.0014 12.9463 16.0017 12.2774 16.0017 11.333V10.833C16.0018 10.466 16.2997 10.1681 16.6667 10.168C17.0339 10.168 17.3316 10.4659 17.3318 10.833V11.333C17.3318 12.2555 17.3331 12.9879 17.2849 13.5771C17.2422 14.0993 17.1584 14.5541 16.9792 14.9717L16.8962 15.1484C16.5609 15.8066 16.0507 16.3571 15.4246 16.7412L15.1492 16.8955C14.6833 17.1329 14.1739 17.2354 13.5769 17.2842C12.9878 17.3323 12.256 17.332 11.3337 17.332H8.66675C7.74446 17.332 7.01271 17.3323 6.42358 17.2842C5.90135 17.2415 5.44665 17.1577 5.02905 16.9785L4.85229 16.8955C4.19396 16.5601 3.64271 16.0502 3.25854 15.4238L3.10425 15.1484C2.86697 14.6827 2.76534 14.1739 2.71655 13.5771C2.66841 12.9879 2.6687 12.2555 2.6687 11.333ZM13.4646 3.11328C14.4201 2.334 15.8288 2.38969 16.7195 3.28027L16.8865 3.46485C17.6141 4.35685 17.6143 5.64423 16.8865 6.53613L16.7195 6.7207L11.6726 11.7686C11.1373 12.3039 10.4624 12.6746 9.72827 12.8408L9.41089 12.8994L7.59351 13.1582C7.38637 13.1877 7.17701 13.1187 7.02905 12.9707C6.88112 12.8227 6.81199 12.6134 6.84155 12.4063L7.10132 10.5898L7.15991 10.2715C7.3262 9.53749 7.69692 8.86241 8.23218 8.32715L13.2791 3.28027L13.4646 3.11328ZM15.7791 4.2207C15.3753 3.81702 14.7366 3.79124 14.3035 4.14453L14.2195 4.2207L9.17261 9.26856C8.81541 9.62578 8.56774 10.0756 8.45679 10.5654L8.41772 10.7773L8.28296 11.7158L9.22241 11.582L9.43433 11.543C9.92426 11.432 10.3749 11.1844 10.7322 10.8271L15.7791 5.78027L15.8552 5.69629C16.185 5.29194 16.1852 4.708 15.8552 4.30371L15.7791 4.2207Z"></path></svg>New Chat</button></div>
      <div className="mt-6 px-4 text-xs font-semibold text-light-text-subtle dark:text-dark-text-subtle tracking-wider">Chats</div>
      <ul id="chat-list" className="flex-1 overflow-y-auto px-2 mt-2 space-y-1">
        {chats.map((chat) => (
          <li key={chat.id} className={`flex items-center justify-between group rounded-lg ${activeChatId === chat.id ? 'bg-accent/10 text-accent' : 'hover:bg-light-border-hover dark:hover:bg-dark-border-hover text-light-text dark:text-dark-text'}`}>
            <button className="flex-1 px-3 py-2 text-left truncate" onClick={() => onChatSelect(chat.id)}>{chat.title}</button>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border" onClick={() => onOpenRenameModal(chat.id)}><RenameIcon /></button>
              <button className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border" onClick={() => onOpenDeleteModal(chat.id)}><DeleteChatIcon /></button>
            </div>
          </li>
        ))}
      </ul>
      
      {/* ++ START: NEW PROFILE SECTION ++ */}
      <div id="profile-section" className={`relative ${userProfile ? '' : 'hidden'}`}>
          {/* This is the dropdown panel that appears when the profile button is clicked */}
          <div id="profile-dropdown" className="absolute bottom-full left-0 w-full p-4 mb-2 hidden">
              <div className="bg-light-background dark:bg-dark-background p-4 rounded-lg shadow-lg border border-light-border dark:border-dark-border">
                  <div className="font-semibold text-light-text dark:text-dark-text" id="profile-username">{userProfile?.username || userProfile?.email}</div>
                  <div className="text-sm text-light-text-subtle dark:text-dark-text-subtle" id="profile-email">{userProfile?.email}</div>
                  <div className="mt-2 text-xs">
                      <span className="font-medium">Plan:</span>
                      <span className="bg-accent/10 text-accent font-semibold px-2 py-0.5 rounded-full" id="profile-plan">{userProfile?.plan}</span>
                  </div>
              </div>
          </div>
          {/* This is the main button visible at the bottom of the sidebar */}
          <button id="profile-btn" className="w-full flex items-center justify-between p-3 hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-colors">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                      <UserIcon />
                  </div>
                  <span className="text-sm font-medium" id="profile-btn-username">{userProfile?.username || userProfile?.email}</span>
              </div>
              <ChevronUpIcon className="text-light-text-subtle dark:text-dark-text-subtle" />
          </button>
      </div>
      {/* ++ END: NEW PROFILE SECTION ++ */}

      <div className="p-4 border-t border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                  {userProfile ? (
                    <button id="logout-btn" className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-colors">
                        <SignOutIcon />
                        <span>Sign Out</span>
                    </button>
                  ) : (
                    <button id="signin-btn" className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-colors" onClick={onOpenSignInModal}>
                        <SignInIcon />
                        Sign In
                    </button>
                  )}
              </div>
              <div className="flex items-center">
                  <button id="settings-btn" className="p-2 rounded-md hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-colors" onClick={onOpenSettingsModal}>
                      <SettingsIcon />
                  </button>
                  <button id="theme-toggle" className="p-2 rounded-md hover:bg-light-border-hover dark:hover:bg-dark-border-hover transition-colors" onClick={onToggleTheme}>
                      <SunIcon id="theme-icon-light" className={isDarkMode ? 'hidden' : ''} />
                      <MoonIcon id="theme-icon-dark" className={isDarkMode ? '' : 'hidden'} />
                  </button>
              </div>
          </div>
      </div>
    </aside>
  );
};

export default Sidebar;
