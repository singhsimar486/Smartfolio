import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements OnInit, OnDestroy, AfterViewInit {
  private lenis: any;

  // Stats for the marquee
  stats = [
    { label: 'Portfolio Value', value: '$2.4M+' },
    { label: 'Active Users', value: '12,000+' },
    { label: 'Stocks Tracked', value: '50,000+' },
    { label: 'Insights Generated', value: '1M+' },
  ];

  // Features
  features = [
    {
      icon: 'chart',
      title: 'Real-Time Tracking',
      description: 'Monitor your portfolio with live market data and instant price updates.'
    },
    {
      icon: 'brain',
      title: 'AI-Powered Insights',
      description: 'Get intelligent recommendations and market analysis powered by AI.'
    },
    {
      icon: 'bell',
      title: 'Smart Alerts',
      description: 'Set price targets and receive instant notifications when they trigger.'
    },
    {
      icon: 'pie',
      title: 'Portfolio Analytics',
      description: 'Visualize allocation, track gains, and optimize your investments.'
    },
    {
      icon: 'trophy',
      title: 'Trading Arena',
      description: 'Compete in virtual trading competitions with $100K paper money. Win prizes and earn achievements.'
    },
    {
      icon: 'target',
      title: 'Price Predictions',
      description: 'View AI-powered stock price predictions with confidence bands and trend analysis.'
    },
  ];

  ngOnInit(): void {
    // Initialize Lenis for smooth scrolling
    this.initLenis();
  }

  ngAfterViewInit(): void {
    // Add intersection observer for animations
    this.initScrollAnimations();
  }

  ngOnDestroy(): void {
    if (this.lenis) {
      this.lenis.destroy();
    }
  }

  private async initLenis(): Promise<void> {
    try {
      const Lenis = (await import('lenis')).default;
      this.lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
      });

      const raf = (time: number) => {
        this.lenis?.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    } catch (e) {
      // Lenis not available, graceful fallback
      console.log('Smooth scroll not available');
    }
  }

  private initScrollAnimations(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.scroll-animate').forEach((el) => {
      observer.observe(el);
    });
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element && this.lenis) {
      this.lenis.scrollTo(element);
    } else if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
