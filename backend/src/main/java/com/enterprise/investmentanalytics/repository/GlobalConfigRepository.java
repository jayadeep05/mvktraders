package com.enterprise.investmentanalytics.repository;

import com.enterprise.investmentanalytics.model.entity.GlobalConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GlobalConfigRepository extends JpaRepository<GlobalConfiguration, String> {
    Optional<GlobalConfiguration> findByKey(String key);
}
