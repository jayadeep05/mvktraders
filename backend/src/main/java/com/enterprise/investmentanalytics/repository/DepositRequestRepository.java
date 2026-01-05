package com.enterprise.investmentanalytics.repository;

import com.enterprise.investmentanalytics.model.entity.DepositRequest;
import com.enterprise.investmentanalytics.model.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DepositRequestRepository extends JpaRepository<DepositRequest, UUID> {
    List<DepositRequest> findByUserIdOrderByCreatedAtDesc(String userId);

    List<DepositRequest> findByStatusOrderByCreatedAtDesc(RequestStatus status);

    List<DepositRequest> findAllByOrderByCreatedAtDesc();
}
