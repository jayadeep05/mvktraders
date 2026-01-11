package com.enterprise.investmentanalytics.model.entity;

import com.enterprise.investmentanalytics.model.enums.RequestStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "deposit_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepositRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private User user;

    // Removed redundant String userId field as it conflicts with the @JoinColumn
    // and causes type mismanagement. We should rely on the User relationship
    // relation.

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    // Screenshot/Proof of payment path
    private String proofImagePath;

    // Optional user note (e.g., Transaction Ref Number)
    private String userNote;

    // Admin rejection reason or approval note
    private String adminNote;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = RequestStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
