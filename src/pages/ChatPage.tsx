import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MessageSquare, Send, Plus, Trash2, Loader2, Users, Building2, Hash, Settings, Crown, Shield, Headphones, ImageIcon, X,
  Video, ExternalLink, Mic,
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import type { TranslationKey } from '@/i18n/translations';

interface ChatRoom {
  id: string;
  name: string;
  type: string;
  client_id: string | null;
  created_by: string;
  created_at: string;
  last_message?: string;
  last_message_at?: string;
  unread?: number;
  client_name?: string;
}

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name?: string;
  role?: string;
}

interface AgencyUser {
  user_id: string;
  display_name: string | null;
  agency_role: string;
}

interface Client {
  id: string;
  name: string;
}

const ROLE_ICON: Record<string, typeof Crown> = { AgencyAdmin: Crown, MediaBuyer: Shield, Client: Building2, Manager: Shield, SalesManager: Shield };
const ROLE_COLOR: Record<string, string> = { AgencyAdmin: 'text-primary', MediaBuyer: 'text-amber-400', Client: 'text-emerald-400', Manager: 'text-blue-400', SalesManager: 'text-orange-400' };

// Detect if content is an image URL stored in our bucket
const isImageMessage = (content: string) =>
  content.startsWith('__img__:');
const getImageUrl = (content: string) =>
  content.replace('__img__:', '');

export default function ChatPage() {
  const { t } = useLanguage();
  const { user, agencyRole } = useAuth();
  const isAdmin = agencyRole === 'AgencyAdmin';
  const isBuyer = agencyRole === 'MediaBuyer';
  const isClient = agencyRole === 'Client';
  const isAgencyMember = isAdmin || isBuyer;

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('custom');
  const [roomClientId, setRoomClientId] = useState('');
  const [roomMeetingLink, setRoomMeetingLink] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const [manageOpen, setManageOpen] = useState(false);
  const [roomMembers, setRoomMembers] = useState<string[]>([]);
  const [savingMembers, setSavingMembers] = useState(false);

  const [allUsers, setAllUsers] = useState<AgencyUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileShowMessages, setMobileShowMessages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);

  // Client: ensure support room exists and client is a member, then show it
  const ensureClientSupportRoom = useCallback(async () => {
    if (!user || !isClient) return;
    const { data: assignments } = await supabase.from('client_users').select('client_id').eq('user_id', user.id);
    const assignedClientIds = assignments?.map(a => a.client_id) || [];
    if (assignedClientIds.length === 0) { setLoadingRooms(false); return; }

    const { data: existingRooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('type', 'support')
      .in('client_id', assignedClientIds)
      .order('updated_at', { ascending: false });

    if (existingRooms && existingRooms.length > 0) {
      const room = existingRooms[0];
      // Ensure the client is a member so they can write
      const { data: membership } = await supabase
        .from('chat_members')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!membership) {
        await supabase.from('chat_members').insert({ room_id: room.id, user_id: user.id, can_write: true });
      }
      setRooms(existingRooms as ChatRoom[]);
      setSelectedRoom(room.id);
      setMobileShowMessages(true);
    } else {
      const { data: clientData } = await supabase.from('clients').select('name').eq('id', assignedClientIds[0]).maybeSingle();
      const roomNameStr = `Support: ${clientData?.name || 'Client'}`;
      const { data: newRoom } = await supabase.from('chat_rooms').insert({
        name: roomNameStr, type: 'support', client_id: assignedClientIds[0], created_by: user.id,
      }).select().single();
      if (newRoom) {
        await supabase.from('chat_members').insert({ room_id: newRoom.id, user_id: user.id, can_write: true });
        setRooms([newRoom as ChatRoom]);
        setSelectedRoom(newRoom.id);
        setMobileShowMessages(true);
      }
    }
    setLoadingRooms(false);
  }, [user, isClient]);

  const fetchRooms = useCallback(async () => {
    if (isClient) return;
    const { data } = await supabase.from('chat_rooms').select('*').order('updated_at', { ascending: false });
    if (!data) { setLoadingRooms(false); return; }

    const supportRooms = data.filter(r => r.type === 'support' && r.client_id);
    const clientIdsToFetch = [...new Set(supportRooms.map(r => r.client_id!))];
    let clientNameMap: Record<string, string> = {};
    if (clientIdsToFetch.length > 0) {
      const { data: cls } = await supabase.from('clients').select('id, name').in('id', clientIdsToFetch);
      if (cls) clientNameMap = Object.fromEntries(cls.map(c => [c.id, c.name]));
    }

    const enriched: ChatRoom[] = data.map(r => ({
      ...r as ChatRoom,
      client_name: r.client_id ? clientNameMap[r.client_id] || undefined : undefined,
    }));

    setRooms(enriched);
    setLoadingRooms(false);
  }, [isClient]);

  const fetchUsersAndClients = useCallback(async () => {
    const [{ data: users }, { data: cls }] = await Promise.all([
      supabase.from('agency_users').select('user_id, display_name, agency_role'),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    if (users) setAllUsers(users as AgencyUser[]);
    if (cls) setClients(cls as Client[]);
  }, []);

  const fetchMessages = useCallback(async (roomId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase.from('chat_messages').select('id, room_id, user_id, content, created_at').eq('room_id', roomId).order('created_at', { ascending: true }).limit(200);
    if (data) {
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: users } = await supabase.from('agency_users').select('user_id, display_name, agency_role').in('user_id', userIds);
      const nameMap = new Map(users?.map(u => [u.user_id, { name: u.display_name || 'User', role: u.agency_role }]) || []);
      setMessages(data.map(m => ({
        ...m,
        display_name: nameMap.get(m.user_id)?.name || 'User',
        role: nameMap.get(m.user_id)?.role || 'Client',
      })));
    }
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (isClient) { ensureClientSupportRoom(); }
    else { fetchRooms(); fetchUsersAndClients(); }
  }, [fetchRooms, fetchUsersAndClients, ensureClientSupportRoom, isClient]);

  useEffect(() => { if (selectedRoom) fetchMessages(selectedRoom); }, [selectedRoom, fetchMessages]);

  // Realtime
  useEffect(() => {
    if (!selectedRoom) return;
    const channel = supabase
      .channel(`chat-${selectedRoom}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${selectedRoom}` },
        async (payload) => {
          const newMsg = payload.new as any;
          const { data: u } = await supabase.from('agency_users').select('display_name, agency_role').eq('user_id', newMsg.user_id).maybeSingle();
          setMessages(prev => [...prev, { ...newMsg, display_name: u?.display_name || 'User', role: u?.agency_role || 'Client' }]);
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedRoom]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedRoom) return;
    setSending(true);
    const { error } = await supabase.from('chat_messages').insert({ room_id: selectedRoom, user_id: user.id, content: newMessage.trim() });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setNewMessage('');
    await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() } as any).eq('id', selectedRoom);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setImagePreview({ file, url: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const cancelImagePreview = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
  };

  const handleSendImage = async () => {
    if (!imagePreview || !user || !selectedRoom) return;
    setUploadingImage(true);
    try {
      const ext = imagePreview.file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(path, imagePreview.file, { contentType: imagePreview.file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      await supabase.from('chat_messages').insert({
        room_id: selectedRoom,
        user_id: user.id,
        content: `__img__:${publicUrl}`,
      });
      await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() } as any).eq('id', selectedRoom);
      cancelImagePreview();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    }
    setUploadingImage(false);
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !user) return;
    setCreating(true);
    const { data: room, error } = await supabase.from('chat_rooms').insert({
      name: roomName.trim(), type: roomType,
      client_id: roomType === 'client' ? roomClientId || null : null,
      created_by: user.id,
    }).select().single();
    if (error) { toast.error(error.message); setCreating(false); return; }
    const membersToAdd = [...new Set([...selectedMembers, user.id])];
    if (membersToAdd.length > 0) {
      await supabase.from('chat_members').insert(membersToAdd.map(uid => ({ room_id: room.id, user_id: uid, can_write: true })));
    }
    setCreating(false); setCreateOpen(false); setRoomName(''); setSelectedMembers([]); setRoomType('custom'); setRoomClientId('');
    toast.success(t('chat.roomCreated' as TranslationKey));
    fetchRooms(); setSelectedRoom(room.id);
  };

  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<string | null>(null);

  const handleDeleteRoom = async (roomId: string) => setConfirmDeleteRoom(roomId);

  const executeDeleteRoom = async () => {
    if (!confirmDeleteRoom) return;
    await supabase.from('chat_rooms').delete().eq('id', confirmDeleteRoom);
    if (selectedRoom === confirmDeleteRoom) { setSelectedRoom(null); setMessages([]); }
    setConfirmDeleteRoom(null);
    fetchRooms(); toast.success(t('common.delete'));
  };

  const openManageMembers = async (roomId: string) => {
    const { data } = await supabase.from('chat_members').select('user_id').eq('room_id', roomId);
    setRoomMembers(data?.map(m => m.user_id) || []);
    setManageOpen(true);
  };

  const saveMembers = async () => {
    if (!selectedRoom) return;
    setSavingMembers(true);
    await supabase.from('chat_members').delete().eq('room_id', selectedRoom);
    if (roomMembers.length > 0) {
      await supabase.from('chat_members').insert(roomMembers.map(uid => ({ room_id: selectedRoom, user_id: uid, can_write: true })));
    }
    setSavingMembers(false); setManageOpen(false); toast.success(t('common.save'));
  };

  const toggleMember = (uid: string) => setSelectedMembers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  const toggleRoomMember = (uid: string) => setRoomMembers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);
  const supportRooms = rooms.filter(r => r.type === 'support');
  const clientRooms = rooms.filter(r => r.type === 'client');
  const teamRooms = rooms.filter(r => r.type === 'team' || r.type === 'custom');
  const voiceRooms = rooms.filter(r => r.type === 'voice');
  const roomTypeIcon = (type: string) => type === 'team' ? Users : type === 'client' ? Building2 : type === 'support' ? Headphones : type === 'voice' ? Mic : Hash;

  const renderRoomItem = (room: ChatRoom) => {
    const RoomIcon = roomTypeIcon(room.type);
    const isActive = selectedRoom === room.id;
    return (
      <button
        key={room.id}
        onClick={() => { setSelectedRoom(room.id); setMobileShowMessages(true); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${isActive ? 'bg-primary/15 text-primary' : 'hover:bg-secondary/50 text-foreground'}`}
      >
        <div className="h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
          <RoomIcon className={`h-4 w-4 ${room.type === 'support' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {room.type === 'support' && room.client_name ? room.client_name : room.name}
            </span>
            {room.type === 'support' && (
              <Badge variant="outline" className="text-[9px] px-1 flex-shrink-0 border-emerald-500/30 text-emerald-500">
                {t('chat.support' as TranslationKey)}
              </Badge>
            )}
            {room.type !== 'support' && (
              <Badge variant="outline" className="text-[9px] px-1 flex-shrink-0">
                {room.type === 'team' ? t('chat.typeTeam' as TranslationKey) :
                 room.type === 'client' ? t('chat.typeClient' as TranslationKey) :
                 t('chat.typeCustom' as TranslationKey)}
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{timeAgo(room.created_at)}</span>
        </div>
      </button>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {isClient ? t('chat.support' as TranslationKey) : t('chat.title' as TranslationKey)}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isClient ? t('chat.supportSubtitle' as TranslationKey) : t('chat.subtitle' as TranslationKey)}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">{t('chat.createRoom' as TranslationKey)}</span>
          </Button>
        )}
      </div>

      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {isClient ? (
          <div className={`${mobileShowMessages ? 'hidden md:flex' : 'flex'} flex-col flex-1 border border-border rounded-lg bg-card overflow-hidden`} />
        ) : null}

        {/* Room list for agency members */}
        {!isClient && (
          <div className={`${mobileShowMessages ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 lg:w-80 flex-shrink-0 border border-border rounded-lg bg-card overflow-hidden`}>
            <ScrollArea className="flex-1">
              {loadingRooms ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : rooms.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">{t('chat.noRooms' as TranslationKey)}</p>
              ) : (
                <div className="p-1">
                   {(supportRooms.length > 0 || clientRooms.length > 0) && (
                     <>
                       <div className="px-3 pt-3 pb-1">
                         <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                           <Building2 className="h-3 w-3" />
                           Клиенты ({supportRooms.length + clientRooms.length})
                         </p>
                       </div>
                       {supportRooms.map(renderRoomItem)}
                       {clientRooms.map(renderRoomItem)}
                     </>
                   )}
                   {teamRooms.length > 0 && (
                     <>
                       <div className="px-3 pt-3 pb-1">
                         <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                           <Hash className="h-3 w-3" />
                           Каналы ({teamRooms.length})
                         </p>
                       </div>
                       {teamRooms.map(renderRoomItem)}
                     </>
                   )}
                   {voiceRooms.length > 0 && (
                     <>
                       <div className="px-3 pt-3 pb-1">
                         <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                           <Mic className="h-3 w-3" />
                           Голосовые ({voiceRooms.length})
                         </p>
                       </div>
                       {voiceRooms.map(room => {
                         const isActive = selectedRoom === room.id;
                         return (
                           <div key={room.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/15' : 'hover:bg-secondary/50'}`}>
                             <div className="h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                               <Video className="h-4 w-4 text-muted-foreground" />
                             </div>
                             <button
                               onClick={() => { setSelectedRoom(room.id); setMobileShowMessages(true); }}
                               className="flex-1 text-left min-w-0"
                             >
                               <span className="text-sm font-medium truncate block">{room.name}</span>
                               <span className="text-[10px] text-muted-foreground">Нажмите чтобы открыть чат</span>
                             </button>
                             {room.name.includes('http') ? (
                               <a href={room.name} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                 <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                                   <ExternalLink className="h-3 w-3" /> Join
                                 </Button>
                               </a>
                             ) : null}
                           </div>
                         );
                       })}
                     </>
                   )}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Message area */}
        <div className={`${!isClient && !mobileShowMessages ? 'hidden md:flex' : 'flex'} flex-col flex-1 border border-border rounded-lg bg-card overflow-hidden`}>
          {!selectedRoom ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{isClient ? t('chat.supportSubtitle' as TranslationKey) : t('chat.selectRoom' as TranslationKey)}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Room header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  {!isClient && <button className="md:hidden text-muted-foreground" onClick={() => setMobileShowMessages(false)}>←</button>}
                  <div>
                    <h3 className="font-semibold text-sm">
                      {selectedRoomData?.type === 'support' && selectedRoomData?.client_name
                        ? `${t('chat.support' as TranslationKey)}: ${selectedRoomData.client_name}`
                        : selectedRoomData?.name}
                    </h3>
                    {isClient && (
                      <p className="text-[10px] text-muted-foreground">{t('chat.supportSubtitle' as TranslationKey)}</p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openManageMembers(selectedRoom)} className="h-8 w-8 p-0">
                      <Settings className="h-4 w-4" />
                    </Button>
                    {selectedRoomData?.type !== 'support' && (
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRoom(selectedRoom)} className="h-8 w-8 p-0 text-destructive/60 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Headphones className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {isClient ? t('chat.startConversation' as TranslationKey) : t('chat.noMessages' as TranslationKey)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, idx) => {
                      const isOwn = msg.user_id === user?.id;
                      const showAuthor = idx === 0 || messages[idx - 1].user_id !== msg.user_id;
                      const RIcon = ROLE_ICON[msg.role || 'Client'] || Building2;
                      const isImg = isImageMessage(msg.content);
                      return (
                        <div key={msg.id} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {showAuthor && (
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                              {(msg.display_name || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          {!showAuthor && <div className="w-8 flex-shrink-0" />}
                          <div className={`max-w-[75%] ${isOwn ? 'items-end' : ''}`}>
                            {showAuthor && (
                              <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'justify-end' : ''}`}>
                                <RIcon className={`h-3 w-3 ${ROLE_COLOR[msg.role || 'Client'] || 'text-muted-foreground'}`} />
                                <span className="text-xs font-semibold">{msg.display_name}</span>
                                <span className="text-[10px] text-muted-foreground">{timeAgo(msg.created_at)}</span>
                              </div>
                            )}
                            {isImg ? (
                              <a href={getImageUrl(msg.content)} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={getImageUrl(msg.content)}
                                  alt="shared image"
                                  className="max-w-xs rounded-xl border border-border/50 hover:opacity-90 transition-opacity cursor-pointer"
                                  loading="lazy"
                                />
                              </a>
                            ) : (
                              <div className={`rounded-xl px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-foreground'}`}>
                                {msg.content}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Image preview bar */}
              {imagePreview && (
                <div className="px-3 py-2 border-t border-border bg-secondary/30 flex items-center gap-3">
                  <img src={imagePreview.url} alt="preview" className="h-14 w-14 object-cover rounded-lg border border-border" />
                  <span className="text-xs text-muted-foreground flex-1 truncate">{imagePreview.file.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelImagePreview}><X className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" onClick={handleSendImage} disabled={uploadingImage} className="gap-1.5">
                    {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send
                  </Button>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-border">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    title="Attach image"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('chat.messagePlaceholder' as TranslationKey)}
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  />
                  <Button size="sm" onClick={handleSend} disabled={sending || !newMessage.trim()} className="flex-shrink-0 px-3">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Room Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('chat.createRoom' as TranslationKey)}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('common.name')}</Label>
              <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder={t('chat.roomNamePlaceholder' as TranslationKey)} />
            </div>
            <div>
              <Label>{t('common.type')}</Label>
              <Select value={roomType} onValueChange={setRoomType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">💬 Текстовый канал</SelectItem>
                  <SelectItem value="voice">🎙️ Голосовой канал (Zoom/Meet)</SelectItem>
                  <SelectItem value="client">🏢 Клиентский</SelectItem>
                  <SelectItem value="custom">📌 Произвольный</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {roomType === 'client' && (
              <div>
                <Label>{t('nav.clients' as TranslationKey)}</Label>
                <Select value={roomClientId} onValueChange={setRoomClientId}>
                  <SelectTrigger><SelectValue placeholder={t('chat.selectClient' as TranslationKey)} /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>{t('chat.members' as TranslationKey)}</Label>
              <ScrollArea className="h-[200px] border border-border rounded-md p-2 mt-1">
                {allUsers.map(u => {
                  const RIcon = ROLE_ICON[u.agency_role] || Building2;
                  return (
                    <div key={u.user_id} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-secondary/50">
                      <Checkbox checked={selectedMembers.includes(u.user_id)} onCheckedChange={() => toggleMember(u.user_id)} id={`member-${u.user_id}`} />
                      <RIcon className={`h-3.5 w-3.5 ${ROLE_COLOR[u.agency_role] || ''}`} />
                      <label htmlFor={`member-${u.user_id}`} className="flex-1 text-sm cursor-pointer">{u.display_name || 'User'}</label>
                      <Badge variant="outline" className="text-[9px]">{u.agency_role}</Badge>
                    </div>
                  );
                })}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={handleCreateRoom} disabled={creating || !roomName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('chat.manageMembers' as TranslationKey)}</DialogTitle></DialogHeader>
          <ScrollArea className="h-[300px] border border-border rounded-md p-2">
            {allUsers.map(u => {
              const RIcon = ROLE_ICON[u.agency_role] || Building2;
              return (
                <div key={u.user_id} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-secondary/50">
                  <Checkbox checked={roomMembers.includes(u.user_id)} onCheckedChange={() => toggleRoomMember(u.user_id)} id={`rm-${u.user_id}`} />
                  <RIcon className={`h-3.5 w-3.5 ${ROLE_COLOR[u.agency_role] || ''}`} />
                  <label htmlFor={`rm-${u.user_id}`} className="flex-1 text-sm cursor-pointer">{u.display_name || 'User'}</label>
                  <Badge variant="outline" className="text-[9px]">{u.agency_role}</Badge>
                </div>
              );
            })}
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={saveMembers} disabled={savingMembers}>
              {savingMembers ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteRoom}
        onOpenChange={(open) => !open && setConfirmDeleteRoom(null)}
        title="Удалить чат?"
        description="Все сообщения в этом чате будут удалены. Это действие необратимо."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={executeDeleteRoom}
      />
    </motion.div>
  );
}
