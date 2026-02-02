import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService, ChatMessage } from '../../services/api';
import { AIChatService } from '../../services/ai-chat.service';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.html',
})
export class AIChat implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  isOpen: boolean = false;
  messages: ChatMessage[] = [];
  newMessage: string = '';
  isLoading: boolean = false;
  isSending: boolean = false;
  errorMessage: string = '';
  private subscription!: Subscription;

  suggestedQuestions: string[] = [
    "How diversified is my portfolio?",
    "Which stocks should I consider selling?",
    "What's my biggest risk right now?",
    "How can I reduce volatility?"
  ];

  constructor(
    private apiService: ApiService,
    private chatService: AIChatService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription = this.chatService.isOpen$.subscribe(isOpen => {
      const wasOpen = this.isOpen;
      this.isOpen = isOpen;
      if (isOpen && !wasOpen) {
        this.loadChatHistory();
        setTimeout(() => {
          this.messageInput?.nativeElement?.focus();
        }, 100);
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  open(): void {
    this.chatService.open();
  }

  close(): void {
    this.chatService.close();
  }

  loadChatHistory(): void {
    this.isLoading = true;
    this.apiService.getChatHistory(50).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  sendMessage(message?: string): void {
    const messageToSend = message || this.newMessage.trim();
    if (!messageToSend || this.isSending) return;

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: messageToSend,
      created_at: new Date().toISOString()
    };
    this.messages.push(userMessage);
    this.newMessage = '';
    this.isSending = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
    this.scrollToBottom();

    this.apiService.askAI(messageToSend).subscribe({
      next: (response) => {
        // Update the user message with actual ID if needed
        // Add assistant response
        const assistantMessage: ChatMessage = {
          id: response.message_id,
          role: 'assistant',
          content: response.response,
          created_at: new Date().toISOString()
        };
        this.messages.push(assistantMessage);
        this.isSending = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: (error) => {
        this.isSending = false;
        this.errorMessage = 'Failed to get response. Please try again.';
        // Remove the user message on error
        this.messages = this.messages.filter(m => m.id !== userMessage.id);
        this.newMessage = messageToSend; // Restore the message
        this.cdr.detectChanges();
      }
    });
  }

  askSuggestion(question: string): void {
    this.sendMessage(question);
  }

  clearHistory(): void {
    if (confirm('Are you sure you want to clear all chat history?')) {
      this.apiService.clearChatHistory().subscribe({
        next: () => {
          this.messages = [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to clear history';
          this.cdr.detectChanges();
        }
      });
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const container = this.messagesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
