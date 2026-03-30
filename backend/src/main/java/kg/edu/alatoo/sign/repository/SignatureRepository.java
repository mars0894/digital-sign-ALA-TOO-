package kg.edu.alatoo.sign.repository;

import kg.edu.alatoo.sign.entity.Signature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SignatureRepository extends JpaRepository<Signature, UUID> {
    List<Signature> findByDocumentId(UUID documentId);
}
