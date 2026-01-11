package com.enterprise.investmentanalytics.repository;

import com.enterprise.investmentanalytics.model.entity.DeleteRequest;
import com.enterprise.investmentanalytics.model.enums.DeleteRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeleteRequestRepository extends JpaRepository<DeleteRequest, UUID> {
    List<DeleteRequest> findByStatus(DeleteRequestStatus status);

    List<DeleteRequest> findByRequestedById(UUID userId);

    List<DeleteRequest> findByEntityId(UUID entityId);
}
