import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProduitService, DataFormat } from '../../services/produit.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  currentFormat: DataFormat = 'JSON';
  apiOnline = false;
  apiMessage = '';
  checkingApi = false;

  private platformId = inject(PLATFORM_ID);

  constructor(public produitService: ProduitService) { }

  ngOnInit(): void {
    this.produitService.currentFormat$.subscribe((format) => {
      this.currentFormat = format;
    });

    // if (isPlatformBrowser(this.platformId)) {
    //   this.checkApiStatus();
    // }
  }

  toggleFormat(format: DataFormat): void {
    this.produitService.setFormat(format);
  }
}
