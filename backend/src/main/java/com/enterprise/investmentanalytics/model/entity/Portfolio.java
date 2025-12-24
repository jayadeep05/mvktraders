package com.enterprise.investmentanalytics.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.enterprise.investmentanalytics.model.enums.ProfitAccrualStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "portfolios")
public class Portfolio {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "total_value", precision = 19, scale = 4)
    private BigDecimal totalValue;

    @Column(name = "total_invested", precision = 19, scale = 4)
    private BigDecimal totalInvested;



    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "profit_percentage", precision = 5, scale = 2)
    private BigDecimal profitPercentage;

    @Enumerated(EnumType.STRING)
    @Column(name = "profit_status")
    private ProfitAccrualStatus profitAccrualStatus;

    @Column(name = "available_profit", precision = 19, scale = 4)
    private BigDecimal availableProfit; // Withdrawable profit balance

    @Column(name = "total_profit_earned", precision = 19, scale = 4)
    private BigDecimal totalProfitEarned; // Lifetime profit (never decreases)
}
